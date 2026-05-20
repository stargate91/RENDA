import os
import shutil
import logging
from pathlib import Path
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from ..db.models import MediaItem, ExtraFile, ActionBatch, ActionLog, ActionType, ActionStatus, ItemStatus
from ..formatter.formatter import Formatter, RenamePreview

from ..utils.logger import logger

class RenamerEngine:
    """
    Engine responsible for physical file operations (move, rename) and 
    maintaining consistency between the filesystem and the database.
    """

    def __init__(self, db_session: Session):
        self.db = db_session
        self.formatter = Formatter()

    def execute_batch(self, previews: List[RenamePreview], batch_name: Optional[str] = None) -> int:
        """
        Executes a batch of rename operations.
        Returns the count of successfully processed items.
        """
        batch = ActionBatch(name=batch_name)
        self.db.add(batch)
        self.db.commit()

        success_count = 0
        for preview in previews:
            if self.execute_single(preview, batch.id):
                success_count += 1
        
        return success_count

    def execute_single(self, preview: RenamePreview, batch_id: Optional[int] = None) -> bool:
        """
        Executes a rename/move operation for a single media item and its associated extras.
        Atomic operation: if any component fails (main file or extra), the entire move 
        is rolled back to the original state.
        """
        item = self.db.query(MediaItem).get(preview.item_id)
        if not item:
            return False
        batch_id = self._ensure_batch_id(batch_id)

        # Track successful moves for rollback
        successful_moves = [] # List[(Path, Path)] - (old_path, target_path)

        try:
            # 1. Célkönyvtár létrehozása
            target_path = Path(preview.target_path)
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # 2. Fő fájl ellenőrzése és mozgatása
            old_path = Path(item.current_path)
            if not old_path.exists():
                raise FileNotFoundError(f"Source not found: {old_path}")

            if target_path.exists() and target_path != old_path:
                if target_path.is_dir():
                    raise FileExistsError(f"Directory exists at target: {target_path}")
                raise FileExistsError(f"File exists at target: {target_path}")

            # Fizikai mozgatás
            for extra_preview in preview.extra_previews:
                extra = self.db.query(ExtraFile).get(extra_preview.extra_id)
                if not extra:
                    continue

                e_old = Path(extra.current_path)
                if not e_old.exists():
                    raise FileNotFoundError(f"Extra source not found: {e_old}")

                if self._preview_action(extra_preview) != "delete":
                    e_target = Path(extra_preview.target_path)
                    if e_target.exists() and e_target != e_old:
                        if e_target.is_dir():
                            raise FileExistsError(f"Directory exists at extra target: {e_target}")
                        raise FileExistsError(f"File exists at extra target: {e_target}")

            shutil.move(str(old_path), str(target_path))
            successful_moves.append((old_path, target_path))
            
            # 3. EXTRÁK MOZGATÁSA VAGY TÖRLÉSE
            for extra_preview in preview.extra_previews:
                extra = self.db.query(ExtraFile).get(extra_preview.extra_id)
                if not extra: continue

                e_old = Path(extra.current_path)
                
                if not e_old.exists():
                    raise FileNotFoundError(f"Extra source not found: {e_old}")

                if self._preview_action(extra_preview) == "delete":
                    # Törlés
                    e_old.unlink()
                    successful_moves.append((e_old, None)) # None jelzi, hogy törölve lett
                else:
                    # Mozgatás
                    e_target = Path(extra_preview.target_path)
                    if e_target.exists() and e_target != e_old:
                        if e_target.is_dir():
                            raise FileExistsError(f"Directory exists at extra target: {e_target}")
                        raise FileExistsError(f"File exists at extra target: {e_target}")
                    e_target.parent.mkdir(parents=True, exist_ok=True)
                    if e_target != e_old:
                        shutil.move(str(e_old), str(e_target))
                        successful_moves.append((e_old, e_target))

            # --- SIKERES MOZGATÁSOK UTÁN: ADATBÁZIS FRISSÍTÉS ---

            # 4. Fő elem frissítése
            old_item_path = item.current_path
            item.current_path = str(target_path)
            item.status = ItemStatus.RENAMED
            self._log_action(batch_id, item_id=item.id, action_type=ActionType.RENAME, 
                            status=ActionStatus.SUCCESS, old_val=old_item_path, new_val=str(target_path))

            # 5. Extrák frissítése
            for extra_preview in preview.extra_previews:
                extra = self.db.query(ExtraFile).get(extra_preview.extra_id)
                if extra:
                    old_e_path = extra.current_path
                    if self._preview_action(extra_preview) == "delete":
                        self.db.delete(extra)
                        self._log_action(batch_id, extra_id=None, action_type=ActionType.DELETE, 
                                        status=ActionStatus.SUCCESS, old_val=old_e_path, new_val=None)
                    else:
                        extra.current_path = extra_preview.target_path
                        self._log_action(batch_id, extra_id=extra.id, action_type=ActionType.RENAME, 
                                        status=ActionStatus.SUCCESS, old_val=old_e_path, new_val=extra_preview.target_path)

            self.db.commit()
            
            # 6. Üres forrásmappa takarítása
            self._cleanup_empty_parent(old_path.parent)
            return True

        except Exception as e:
            logger.error(f"Error during rename ({preview.target_name}): {e}")
            self.db.rollback()

            # --- VISSZAGÖRGETÉS (Rollback) ---
            if successful_moves:
                logger.info(f"Rolling back {len(successful_moves)} files...")
                for orig_p, curr_p in reversed(successful_moves):
                    try:
                        if curr_p is None:
                            # Törölt fájl - ezt sajnos nem tudjuk egyszerűen visszagörgetni (hacsak nincs lomtárba rakva)
                            logger.warning(f"Cannot rollback deleted file: {orig_p}")
                        elif curr_p.exists():
                            shutil.move(str(curr_p), str(orig_p))
                    except Exception as re:
                        logger.critical(f"CRITICAL: Rollback failed ({curr_p} -> {orig_p}): {re}")

            # Hiba mentése az adatbázisba
            self._log_action(batch_id, item_id=item.id, action_type=ActionType.RENAME, 
                            status=ActionStatus.FAILED, old_val=item.current_path, 
                            new_val=preview.target_path, error=str(e))
            self.db.commit()
            return False

    def _execute_extra_move(self, extra: ExtraFile, target_path_str: str, batch_id: int):
        """Egyetlen extra fájl mozgatása."""
        old_path = Path(extra.current_path)
        new_path = Path(target_path_str)
        
        if old_path.exists():
            if new_path.exists() and new_path != old_path:
                if new_path.is_dir():
                    raise FileExistsError(f"Directory exists at extra target: {new_path}")
                raise FileExistsError(f"File exists at extra target: {new_path}")
            new_path.parent.mkdir(parents=True, exist_ok=True)
            if new_path != old_path:
                shutil.move(str(old_path), str(new_path))
            
            old_current = extra.current_path
            extra.current_path = str(new_path)
            
            self._log_action(batch_id, extra_id=extra.id, action_type=ActionType.RENAME, 
                            status=ActionStatus.SUCCESS, old_val=old_current, new_val=str(new_path))

    def _ensure_batch_id(self, batch_id: Optional[int]) -> int:
        """Creates an ad-hoc batch when execute_single is called directly."""
        if batch_id is not None:
            return batch_id

        batch = ActionBatch(name="Single rename")
        self.db.add(batch)
        self.db.commit()
        return batch.id

    def _preview_action(self, preview: RenamePreview) -> str:
        """Normalizes preview actions from config/UI values."""
        return str(getattr(preview, "action", "rename") or "rename").strip().lower()

    def _log_action(self, batch_id, item_id=None, extra_id=None, action_type=None, status=None, old_val=None, new_val=None, error=None):
        """Művelet naplózása az adatbázisba."""
        log = ActionLog(
            batch_id=batch_id,
            media_item_id=item_id,
            extra_file_id=extra_id,
            action_type=action_type,
            status=status,
            old_value=old_val,
            new_value=new_val,
            error_message=error
        )
        self.db.add(log)

    def undo_batch(self, batch_id: int, progress_callback=None) -> int:
        """
        Visszavonja egy adott batch összes műveletét.
        Visszaadja a sikeresen visszavont műveletek számát.
        """
        logs = self.db.query(ActionLog).filter(
            ActionLog.batch_id == batch_id,
            ActionLog.status == ActionStatus.SUCCESS
        ).order_by(ActionLog.id.desc()).all() # FORDÍTOTT SORREND!

        undo_count = 0
        total = len(logs)
        for i, log in enumerate(logs):
            if self._undo_single(log):
                undo_count += 1
            if progress_callback:
                progress_callback(i + 1, total)
        
        return undo_count

    def _undo_single(self, log: ActionLog) -> bool:
        """Egyetlen művelet visszavonása."""
        try:
            if log.action_type not in [ActionType.RENAME, ActionType.MOVE]:
                return False

            new_path = Path(log.new_value)
            old_path = Path(log.old_value)

            if not new_path.exists():
                logger.error(f"Undo hiba: A fájl már nem található a célhelyen: {new_path}")
                log.status = ActionStatus.FAILED
                log.error_message = "File missing at destination"
                self.db.commit()
                return False

            # Visszamozgatás
            old_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(new_path), str(old_path))

            # DB frissítés
            if log.media_item_id:
                item = self.db.query(MediaItem).get(log.media_item_id)
                if item:
                    item.current_path = str(old_path)
                    item.status = ItemStatus.MATCHED # Visszaállítjuk MATCHED státuszba
            elif log.extra_file_id:
                extra = self.db.query(ExtraFile).get(log.extra_file_id)
                if extra:
                    extra.current_path = str(old_path)

            log.status = ActionStatus.UNDONE
            self.db.commit()

            # Takarítás a célhelyen (ahol korábban a fájl volt)
            self._cleanup_empty_parent(new_path.parent)
            
            return True

        except Exception as e:
            logger.exception(f"Undo hiba: {e}")
            self.db.rollback()
            return False

    def _cleanup_empty_parent(self, path: Path):
        """
        Recursively removes empty parent directories up the hierarchy.
        Includes guards to prevent deleting drive roots or the library root.
        """
        try:
            # 1. Stop if we reached the root of the filesystem
            if not path or path.parent == path:
                return

            # 2. Stop if it's a drive root (Windows)
            if len(path.parts) <= 1:
                return

            # 3. Check if this is a protected path (e.g. library root)
            # We fetch this dynamically or can pass it in. For now, let's check settings if available.
            protected_paths = set()
            try:
                from ..db.models import UserSetting
                # Cache or fetch once? For simplicity in this method, we fetch if not already provided.
                # However, it's better to protect common sensitive paths.
                lib_path_setting = self.db.query(UserSetting).filter(UserSetting.key == "folder_library_path").first()
                if lib_path_setting and lib_path_setting.value:
                    protected_paths.add(Path(lib_path_setting.value).resolve())
            except:
                pass

            if path.resolve() in protected_paths:
                logger.debug(f"Cleanup stopped: {path} is a protected library root.")
                return

            # 4. Actual removal if empty
            if path.exists() and path.is_dir() and not any(path.iterdir()):
                logger.info(f"Cleaning up empty directory: {path}")
                path.rmdir()
                # Recurse upwards
                self._cleanup_empty_parent(path.parent)
        except Exception as e:
            logger.debug(f"Cleanup failed for {path}: {e}")
