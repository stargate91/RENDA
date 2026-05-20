from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from .collector import Collector
from .categorizer import Categorizer
from .linker import Linker
from .nfo_parser import NFOParser
from .probe import TechnicalProber
from .analyzer import Analyzer
from .decision_engine import DecisionEngine
from ..formatter.formatter import Formatter, FormatterConfig
from ..db.models import MediaItem, ExtraFile, ItemType, ItemStatus, ExtraCategory, PartType
from ..resolver.resolver import Resolver
from ..db.base import Session as DbSession
from ..utils.logger import logger

import time
import hashlib
import threading

# Global status for tracking progress across threads
scan_status = {
    "active": False,
    "total": 0,
    "current": 0,
    "phase": "idle", # 'collecting', 'probing', 'enriching', 'idle'
    "start_time": 0,
}
scan_status_lock = threading.Lock()

def update_scan_status(updates: Dict[str, Any]):
    """Safely updates the global scan status."""
    with scan_status_lock:
        scan_status.update(updates)

def increment_scan_status_current():
    """Safely increments the current progress count."""
    with scan_status_lock:
        scan_status["current"] += 1

class ScannerManager:
    """
    Coordinator for the entire scanning and data enrichment pipeline.
    Handles file discovery, technical probing, and metadata extraction.
    """

    def __init__(self, db_session: Session, min_video_size_mb: int = 500, min_video_duration_minutes: int = 12):
        self.db = db_session
        # For hybrid scanning, default to 50MB fast-track unless a smaller/custom size is explicitly requested (e.g. in tests)
        size_mb = min_video_size_mb if min_video_size_mb != 500 else 50
        self.collector = Collector(size_mb)
        self.categorizer = Categorizer()
        self.linker = Linker()
        self.prober = TechnicalProber()
        self.analyzer = Analyzer()
        self.decision_engine = DecisionEngine()
        self.nfo_parser = NFOParser()
        self.formatter = Formatter() # Default config for now
        self.min_video_duration_minutes = min_video_duration_minutes
        self.preprobed_data = {}

    def scan_and_save(self, paths: List[str]):
        """
        Phase 1: Fast scanning and basic database population.
        Implements change-detection to skip files that haven't been modified.
        """
        global scan_status
        update_scan_status({"active": True, "phase": "collecting", "current": 0, "total": 0, "start_time": time.time()})
        
        try:
            logger.info("Phase 1: Collecting files and establishing links...")
            files = self.collector.collect(paths)
            potential_media = files["potential_media"]
            potential_extras = files["potential_extras"]

            # Load all existing items to cache for fast lookup
            existing_items = {item.original_path: item for item in self.db.query(MediaItem).all()}
            existing_extras = {ex.original_path for ex in self.db.query(ExtraFile.original_path).all()}

            # Identify which potential media candidates need technical probing to determine duration
            probe_targets = []
            probe_durations = {}

            for p in potential_media:
                p_str = str(p)
                stat = p.stat()
                mtime = stat.st_mtime
                size = stat.st_size
                
                existing = existing_items.get(p_str)
                if existing and existing.size == size and existing.mtime == mtime and existing.duration is not None:
                    # Cache existing duration
                    probe_durations[p_str] = existing.duration
                else:
                    probe_targets.append(p)

            # Probe targets in parallel using ThreadPoolExecutor
            # (releases the GIL on subprocess.run and avoids pickling errors on mock patches in tests under Windows)
            import os
            if probe_targets:
                logger.info(f"Probing {len(probe_targets)} potential media candidates...")
                update_scan_status({"phase": "probing", "total": len(probe_targets), "current": 0})
                
                max_workers_proc = min(os.cpu_count() or 4, 8)
                with ThreadPoolExecutor(max_workers=max_workers_proc) as executor:
                    future_to_path = {executor.submit(self.prober.probe, str(p)): p for p in probe_targets}
                    for future in future_to_path:
                        path = future_to_path[future]
                        path_str = str(path)
                        try:
                            raw_data = future.result()
                            self.preprobed_data[path_str] = raw_data
                            info = self.prober.extract_info(raw_data)
                            probe_durations[path_str] = info.get("duration")
                        except Exception as e:
                            logger.error(f"FFprobe failed for {path_str}: {e}")
                            probe_durations[path_str] = None
                        finally:
                            increment_scan_status_current()

            # Separate into media_paths and extra_paths based on duration limit
            media_paths = []
            extra_paths = list(potential_extras)

            limit_seconds = self.min_video_duration_minutes * 60
            for p in potential_media:
                p_str = str(p)
                duration = probe_durations.get(p_str)
                
                if duration is not None and duration < limit_seconds:
                    logger.info(f"Demoting {p.name} to extra because duration {duration:.1f}s is less than {limit_seconds}s.")
                    extra_paths.append(p)
                else:
                    media_paths.append(p)

            # Clean up database if a file switched categories
            for p in extra_paths:
                p_str = str(p)
                existing_media = existing_items.get(p_str)
                if existing_media:
                    logger.info(f"Removing former MediaItem {p_str} from MediaItem table because it is now categorized as an ExtraFile.")
                    self.db.delete(existing_media)
                    existing_items.pop(p_str, None)

            for p in media_paths:
                p_str = str(p)
                if p_str in existing_extras:
                    logger.info(f"Removing former ExtraFile {p_str} from ExtraFile table because it is now categorized as a MediaItem.")
                    self.db.query(ExtraFile).filter(ExtraFile.original_path == p_str).delete()
                    existing_extras.discard(p_str)

            # Recalculate final links
            links = self.linker.link(media_paths, extra_paths)
            
            path_to_item = {}
            to_process = [] # Items that need probing and enrichment

            update_scan_status({"phase": "collecting", "total": len(media_paths) + len(extra_paths), "current": 0})

            for p in media_paths:
                stat = p.stat()
                mtime = stat.st_mtime
                size = stat.st_size
                p_str = str(p)
                
                existing = existing_items.get(p_str)
                
                if existing and existing.size == size and existing.mtime == mtime:
                    path_to_item[p] = existing
                    if existing.status in [ItemStatus.NEW, ItemStatus.UNCERTAIN, ItemStatus.MULTIPLE, ItemStatus.NO_MATCH, ItemStatus.ERROR]:
                        to_process.append(existing)
                else:
                    if existing:
                        existing.size = size
                        existing.mtime = mtime
                        existing.status = ItemStatus.NEW
                        item = existing
                    else:
                        item = MediaItem(
                            original_path=p_str, current_path=p_str,
                            filename=p.name, extension=p.suffix.lower(),
                            folder_name=p.parent.name, size=size, mtime=mtime,
                            item_type=ItemType.MOVIE, status=ItemStatus.NEW
                        )
                        self.db.add(item)
                    
                    path_to_item[p] = item
                    to_process.append(item)
                
                increment_scan_status_current()

            self.db.flush()

            # Handle extras
            for p in extra_paths:
                p_str = str(p)
                if p_str in existing_extras:
                    increment_scan_status_current()
                    continue

                res = self.categorizer.categorize(p, self.db)
                if res[0] is None:
                    increment_scan_status_current()
                    continue
                    
                category, subtype = res
                parent_path = links.get(p)
                parent_item = path_to_item.get(parent_path)
                
                if parent_item:
                    extra = ExtraFile(
                        parent_item_id=parent_item.id,
                        category=category, subtype=subtype,
                        original_path=p_str, current_path=p_str,
                        extension=p.suffix.lower()
                    )
                    self.db.add(extra)
                
                increment_scan_status_current()

            self.db.commit()
            
            # PHASE 2: Technical Probing & Enrichment
            if to_process:
                logger.info(f"Scan complete. {len(to_process)} items need processing.")
                self.enrich_all(to_process)
                self.resolve_all(to_process)
            
            self.db.expire_all()
            logger.info("Scan complete.")
        except Exception as e:
            import traceback
            logger.error(f"Scan failed: {e}")
            logger.error(traceback.format_exc())
            raise
        finally:
            self.db.close()
            update_scan_status({"active": False, "phase": "idle"})


    def enrich_all(self, items: List[MediaItem]):
        """
        Enriches media items with technical metadata (FFprobe) and logical metadata (Guessit).
        Uses ThreadPool for FFprobe (CPU/IO) and Guessit/Logic.
        """
        import os

        if not items:
            return

        # 1. Technical Probing (ThreadPool for FFprobe)
        paths_to_probe = []
        probe_results = {}

        # Prepopulate with pre-probed data
        for path_str, raw_data in self.preprobed_data.items():
            probe_results[path_str] = raw_data

        for item in items:
            path_str = item.original_path
            # Skip if we already pre-probed this or if it has duration set in database
            if path_str in self.preprobed_data:
                continue
            if item.duration is not None:
                continue
            paths_to_probe.append(path_str)

        if paths_to_probe:
            logger.info(f"Phase 2: Technical Probing for {len(paths_to_probe)} items...")
            update_scan_status({"phase": "probing", "total": len(paths_to_probe), "current": 0})
            
            max_workers_proc = min(os.cpu_count() or 4, 8)
            with ThreadPoolExecutor(max_workers=max_workers_proc) as executor:
                future_to_path = {executor.submit(self.prober.probe, p): p for p in paths_to_probe}
                for future in future_to_path:
                    path = future_to_path[future]
                    try:
                        probe_results[path] = future.result()
                    except Exception as e:
                        logger.error(f"FFprobe failed for {path}: {e}")
                        probe_results[path] = None
                    finally:
                        increment_scan_status_current()

        logger.info(f"Phase 3: Metadata Enrichment for {len(items)} items...")
        update_scan_status({"phase": "enriching", "total": len(items), "current": 0})
        
        # 2. Logical Enrichment (ThreadPool for Guessit and DB updates)
        tasks_data = [(item.id, item) for item in items]
        
        def process_item_metadata_task(task_data):
            item_id, transient_item = task_data
            local_db = None
            item = None
            try:
                if item_id is not None:
                    local_db = DbSession()
                    item = local_db.query(MediaItem).filter(MediaItem.id == item_id).first()
                
                if not item:
                    # In test environments, modify the transient item in-place
                    item = transient_item

                p = Path(item.original_path)
                
                # NFO (IMDb ID)
                item.nfo_imdb_id = self.nfo_parser.get_imdb_id(p)
                
                # Technical data from probe results
                probe_data = probe_results.get(item.original_path)
                if probe_data:
                    tech_info = self.prober.extract_info(probe_data)
                    item.duration = tech_info["duration"]
                    item.size = tech_info["size"] or item.size
                    item.resolution = tech_info["resolution"]
                    item.video_codec = tech_info["video_codec"]
                    item.video_bitrate = tech_info["video_bitrate"]
                    item.audio_codec = tech_info["audio_codec"]
                    item.audio_channels = tech_info["audio_channels"]
                    item.audio_bitrate = tech_info["audio_bitrate"]
                    item.framerate = tech_info["framerate"]
                    item.bit_depth = tech_info["bit_depth"]
                    item.hdr_type = tech_info["hdr_type"]
                    item.audio_streams = tech_info["audio_streams"]
                    item.internal_title = tech_info["internal_title"]
                else:
                    # Technical probe failed or missing duration/info
                    if not item.duration:
                        item.status = ItemStatus.ERROR
                
                # Guessit analysis
                if not item.nfo_imdb_id:
                    triple = self.analyzer.get_triple_data(
                        item.internal_title, item.filename, item.folder_name
                    )
                    
                    # --- Filename data (FN) ---
                    fn = triple.get("fn", {})
                    item.fn_title = self.analyzer.reconstruct_title(fn, item.filename)
                    item.fn_year = fn.get('year')
                    item.fn_season = fn.get('season')
                    item.fn_episode = str(fn.get('episode')) if fn.get('episode') else None
                    
                    # --- Folder data (FD) ---
                    fd = triple.get("fd", {})
                    item.fd_title = self.analyzer.reconstruct_title(fd, item.folder_name)
                    item.fd_year = fd.get('year')
                    item.fd_season = fd.get('season')
                    item.fd_episode = str(fd.get('episode')) if fd.get('episode') else None

                    # --- Internal title data (IT) ---
                    it = triple.get("it", {})
                    item.it_title = self.analyzer.reconstruct_title(it, item.internal_title) if item.internal_title else None
                    item.it_year = it.get('year')
                    item.it_season = it.get('season')
                    item.it_episode = str(it.get('episode')) if it.get('episode') else None
                    
                    it_type = it.get('type')
                    if it_type == 'episode' and not it.get('season'):
                        it_type = 'movie'
                    item.it_item_type = it_type

                    # --- Decision Logic & Metadata Cleanup ---
                    item.item_type = self.decision_engine.determine_item_type(
                        triple, item.filename, item.folder_name, has_nfo=bool(item.nfo_imdb_id)
                    )
                    
                    # Apply type-based cleanup
                    cleanup = self.decision_engine.get_clean_metadata(item.item_type, triple)
                    if cleanup:
                        if "season" in cleanup: item.fn_season = cleanup["season"]
                        if "episode" in cleanup: item.fn_episode = cleanup["episode"]

                    item.fn_item_type = fn.get('type')
                    item.fd_item_type = fd.get('type')
                    
                    # --- Part Detection ---
                    raw_part = fn.get('part') or fn.get('cd') or fn.get('disc') or fn.get('volume')
                    if raw_part:
                        title_lower = (item.fn_title or "").lower()
                        is_part_of_title = "part" in title_lower or "episode" in title_lower
                        has_episode_num = fn.get('episode') is not None
                        
                        if not is_part_of_title and not has_episode_num:
                            try:
                                val = int(raw_part)
                                item.fn_part = val
                                item.part = val
                            except (ValueError, TypeError):
                                pass
                            
                            if 'cd' in fn: item.part_type = PartType.CD
                            elif 'disc' in fn: item.part_type = PartType.DISC
                            elif 'volume' in fn: item.part_type = PartType.VOLUME
                            else: item.part_type = PartType.PART
                    
                    # --- Group Hash ---
                    item.group_hash = self.analyzer.generate_group_hash(
                        title=item.fn_title or item.fd_title or item.folder_name,
                        year=item.fn_year or item.fd_year,
                        season=item.fn_season,
                        episode=fn.get('episode')
                    )
                    
                    # D. Generate Planned Path (Lite)
                    res = item.resolution or ""
                    if res and "x" in res.lower() and "p" not in res.lower():
                        try:
                            from ..formatter.tech_mapping import map_resolution
                            parts = res.lower().split("x")
                            if len(parts) == 2:
                                res = map_resolution(int(parts[0]), int(parts[1]))
                        except: pass

                    lite_ctx = {
                        "title": item.fn_title or item.fd_title or item.filename,
                        "year": str(item.fn_year or item.fd_year or ""),
                        "resolution": res,
                        "ext": item.extension or ""
                    }
                    if item.item_type == ItemType.EPISODE:
                        lite_ctx["series_title"] = lite_ctx["title"]
                        lite_ctx["season"] = self.formatter.format_number(item.fn_season or "1")
                        lite_ctx["episode"] = self.formatter.format_number(item.fn_episode or "0")
                        item.planned_path = self.formatter.format_episode_filename(lite_ctx)
                    else:
                        item.planned_path = self.formatter.format_movie_filename(lite_ctx)

                # E. Language for extras
                for extra in item.extras:
                    if extra.category in [ExtraCategory.SUBTITLE, ExtraCategory.AUDIO]:
                        extra.language = self.analyzer.extract_language(extra.original_path)
                
                # Az állapotot itt nem bántjuk, mert a következő fázisban a Resolver (TMDB) döinti el a végeredményt!

                if local_db:
                    local_db.commit()
            except Exception as e:
                import traceback
                logger.error(f"Error enriching item: {e}")
                logger.error(traceback.format_exc())
                if local_db:
                    local_db.rollback()
                try:
                    # Set status to ERROR so we know it failed
                    item.status = ItemStatus.ERROR
                    if local_db:
                        # Re-fetch or merge to make sure it commits to DB
                        db_item = local_db.query(MediaItem).filter(MediaItem.id == item_id).first()
                        if db_item:
                            db_item.status = ItemStatus.ERROR
                            local_db.commit()
                except Exception as db_ex:
                    logger.error(f"Failed to set status to ERROR for item: {db_ex}")
            finally:
                increment_scan_status_current()
                if local_db:
                    DbSession.remove()

        with ThreadPoolExecutor(max_workers=10) as executor:
            list(executor.map(process_item_metadata_task, tasks_data))

        logger.info("Enrichment complete.")

    def resolve_all(self, items: List[MediaItem]):
        """
        Performs online metadata resolution using TMDB/IMDb.
        """
        if not items:
            return

        logger.info(f"Phase 4: API Metadata Resolution for {len(items)} items...")
        update_scan_status({"phase": "resolving", "total": len(items), "current": 0})

        # Deduplicate items by group_hash to avoid race conditions in propagate_match
        unique_items = []
        seen_hashes = set()
        for item in items:
            if not item.group_hash:
                unique_items.append(item)
            elif item.group_hash not in seen_hashes:
                unique_items.append(item)
                seen_hashes.add(item.group_hash)
        
        item_ids = [item.id for item in unique_items]
        db_lock = threading.Lock()

        def resolve_task(item_id: int):
            with db_lock:
                local_db = DbSession()
                try:
                    item = local_db.query(MediaItem).filter(MediaItem.id == item_id).first()
                    if not item:
                        return
                    
                    # Load primary metadata language setting for resolution
                    from ..db.models import UserSetting
                    primary_lang = "en"
                    lang_setting = local_db.query(UserSetting).filter(UserSetting.key == "primary_metadata_language").first()
                    if lang_setting:
                        primary_lang = lang_setting.value
                    
                    # Run the Resolver with target language
                    resolver = Resolver(local_db)
                    resolver.resolve_item(item, language=primary_lang)
                    resolver.propagate_match(item)
                    
                    # If matched successfully, enrich metadata immediately
                    if item.status == ItemStatus.MATCHED:
                        from .metadata_enricher import MetadataEnricher
                        from ..db.models import UserSetting
                        
                        # Load language preferences from settings
                        primary_lang = "en"
                        fallback_lang = None
                        try:
                            pl = local_db.query(UserSetting).filter(UserSetting.key == "primary_metadata_language").first()
                            fl = local_db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
                            if pl and pl.value: primary_lang = pl.value
                            if fl and fl.value and fl.value != "none": fallback_lang = fl.value
                        except: pass
                        
                        enricher = MetadataEnricher(local_db)
                        enricher.enrich_matched_item(item, language=primary_lang, fallback_language=fallback_lang)
                        
                        # Enrich all siblings that got matched via propagate_match as well
                        if item.group_hash:
                            siblings = local_db.query(MediaItem).filter(
                                MediaItem.group_hash == item.group_hash,
                                MediaItem.id != item.id,
                                MediaItem.status == ItemStatus.MATCHED
                            ).all()
                            for sib in siblings:
                                try:
                                    enricher.enrich_matched_item(sib, language=primary_lang, fallback_language=fallback_lang)
                                except Exception as sib_ex:
                                    logger.warning(f"Failed to enrich sibling item {sib.id}: {sib_ex}")
                    
                except Exception as e:
                    import traceback
                    logger.error(f"Error resolving item ID {item_id}: {e}")
                    logger.error(traceback.format_exc())
                finally:
                    increment_scan_status_current()
                    DbSession.remove()

        # ThreadPool a hálózati kérésekhez (limitálva a rate limit elkerülésére)
        with ThreadPoolExecutor(max_workers=5) as executor:
            list(executor.map(resolve_task, item_ids))

        logger.info("Resolution complete.")
