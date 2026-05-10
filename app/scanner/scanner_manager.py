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
from ..formatter.formatter import Formatter, FormatterConfig
from ..db.models import MediaItem, ExtraFile, ItemType, ItemStatus, ExtraCategory, PartType
from ..resolver.resolver import Resolver
from ..db.base import Session as DbSession
from ..utils.logger import logger

import time
import hashlib

# Global status for tracking progress across threads
scan_status = {
    "active": False,
    "total": 0,
    "current": 0,
    "phase": "idle", # 'collecting', 'probing', 'enriching', 'idle'
    "start_time": 0,
}

class ScannerManager:
    """
    Coordinator for the entire scanning and data enrichment pipeline.
    Handles file discovery, technical probing, and metadata extraction.
    """

    def __init__(self, db_session: Session, min_video_size_mb: int = 500):
        self.db = db_session
        self.collector = Collector(min_video_size_mb)
        self.categorizer = Categorizer()
        self.linker = Linker()
        self.prober = TechnicalProber()
        self.analyzer = Analyzer()
        self.nfo_parser = NFOParser()
        self.formatter = Formatter() # Default config for now

    def scan_and_save(self, paths: List[str]):
        """
        Phase 1: Fast scanning and basic database population.
        Implements change-detection to skip files that haven't been modified.
        """
        global scan_status
        scan_status.update({"active": True, "phase": "collecting", "current": 0, "total": 0, "start_time": time.time()})
        
        try:
            logger.info("Phase 1: Collecting files and establishing links...")
            files = self.collector.collect(paths)
            media_paths = files["potential_media"]
            extra_paths = files["potential_extras"]

            links = self.linker.link(media_paths, extra_paths)
            
            # Load all existing items to cache for fast lookup
            existing_items = {item.original_path: item for item in self.db.query(MediaItem).all()}
            
            path_to_item = {}
            to_process = [] # Items that need probing and enrichment

            scan_status["total"] = len(media_paths) + len(extra_paths)

            for p in media_paths:
                stat = p.stat()
                mtime = stat.st_mtime
                size = stat.st_size
                p_str = str(p)
                
                existing = existing_items.get(p_str)
                
                if existing and existing.size == size and existing.mtime == mtime:
                    path_to_item[p] = existing
                    if existing.status == ItemStatus.NEW:
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
                
                scan_status["current"] += 1

            self.db.flush()

            # Handle extras
            for p in extra_paths:
                p_str = str(p)
                existing_extra = self.db.query(ExtraFile).filter(ExtraFile.original_path == p_str).first()
                if existing_extra:
                    scan_status["current"] += 1
                    continue

                res = self.categorizer.categorize(p)
                if res[0] is None:
                    scan_status["current"] += 1
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
                
                scan_status["current"] += 1

            self.db.commit()
            
            # PHASE 2: Technical Probing & Enrichment
            if to_process:
                logger.info(f"Scan complete. {len(to_process)} items need processing.")
                self.enrich_all(to_process)
                self.resolve_all(to_process)
                self.db.expire_all()
                
                # Start background image downloading
                import threading
                from .image_worker import ImageWorker
                def run_image_worker():
                    local_db = DbSession()
                    try:
                        iw = ImageWorker(local_db, "./data")
                        iw.process_all()
                    finally:
                        DbSession.remove()
                threading.Thread(target=run_image_worker, daemon=True).start()
        
            logger.info("Scan complete.")
        except Exception as e:
            import traceback
            logger.error(f"Scan failed: {e}")
            logger.error(traceback.format_exc())
            raise
        finally:
            scan_status["active"] = False
            scan_status["phase"] = "idle"

    def _reconstruct_movie_title(self, data: Dict[str, Any], original_text: str) -> str:
        """
        Reconstructs the movie title by putting back trimmed numbers to their original positions.
        """
        title = data.get('title')
        is_movie = data.get('type') == 'movie'
        is_lonely_episode = data.get('type') == 'episode' and not data.get('season')
        
        if not title or not (is_movie or is_lonely_episode):
            return title
            
        episode = data.get('episode')
        part = data.get('part')
        result = str(title)
        
        if episode:
            ep_str = str(episode)
            title_pos = original_text.lower().find(title.lower())
            ep_pos = original_text.lower().find(ep_str)
            
            if ep_pos < title_pos:
                result = f"{ep_str} {result}"
            else:
                result = f"{result} {ep_str}"
                
        if part:
            result = f"{result} {part}"
            
        return result

    def enrich_all(self, items: List[MediaItem]):
        """
        Enriches media items with technical metadata (FFprobe) and logical metadata (Guessit).
        Uses ProcessPool for FFprobe (CPU/IO) and ThreadPool for Guessit/Logic.
        """
        import os

        if not items:
            return

        logger.info(f"Phase 2: Technical Probing for {len(items)} items...")
        scan_status.update({"phase": "probing", "total": len(items), "current": 0})
        
        # 1. Technical Probing (ProcessPool for FFprobe)
        paths = [item.original_path for item in items]
        probe_results = {}
        
        max_workers_proc = min(os.cpu_count() or 4, 8)
        with ProcessPoolExecutor(max_workers=max_workers_proc) as executor:
            future_to_path = {executor.submit(self.prober.probe, p): p for p in paths}
            for future in future_to_path:
                path = future_to_path[future]
                try:
                    probe_results[path] = future.result()
                except Exception as e:
                    logger.error(f"FFprobe failed for {path}: {e}")
                    probe_results[path] = None
                finally:
                    scan_status["current"] += 1

        logger.info(f"Phase 3: Metadata Enrichment for {len(items)} items...")
        scan_status.update({"phase": "enriching", "total": len(items), "current": 0})
        
        # 2. Logical Enrichment (ThreadPool for Guessit and DB updates)
        item_ids = [item.id for item in items]
        
        def process_item_metadata_task(item_id: int):
            local_db = DbSession()
            try:
                item = local_db.query(MediaItem).filter(MediaItem.id == item_id).first()
                if not item:
                    return

                p = Path(item.original_path)
                
                # NFO (IMDb ID)
                item.nfo_imdb_id = self.nfo_parser.get_imdb_id(p)
                
                # Technical data from probe results
                probe_data = probe_results.get(item.original_path)
                if probe_data:
                    tech_info = self.prober.extract_info(probe_data)
                    item.duration = tech_info["duration"]
                    item.resolution = tech_info["resolution"]
                    item.video_codec = tech_info["video_codec"]
                    item.audio_codec = tech_info["audio_codec"]
                    item.audio_streams = tech_info["audio_streams"]
                    item.internal_title = tech_info["internal_title"]
                
                # Guessit analysis
                triple = self.analyzer.get_triple_data(
                    item.internal_title, item.filename, item.folder_name
                )
                
                # --- Filename data (FN) ---
                fn = triple.get("fn", {})
                item.fn_title = self._reconstruct_movie_title(fn, item.filename)
                item.fn_year = fn.get('year')
                item.fn_season = fn.get('season')
                item.fn_episode = str(fn.get('episode')) if fn.get('episode') else None
                
                # --- Folder data (FD) ---
                fd = triple.get("fd", {})
                item.fd_title = self._reconstruct_movie_title(fd, item.folder_name)
                item.fd_year = fd.get('year')
                item.fd_season = fd.get('season')
                item.fd_episode = str(fd.get('episode')) if fd.get('episode') else None

                # --- Decision Logic: NFO is King ---
                if item.nfo_imdb_id:
                    # Ha van NFO-nk IMDb ID-val, az minden felett áll.
                    # Nincs találgatás, nincs Guessit félreértés.
                    item.item_type = ItemType.MOVIE
                    item.fn_season = None
                    item.fn_episode = None
                    item.fd_season = None
                    item.fd_episode = None
                    item.fn_item_type = 'movie'
                    item.fd_item_type = 'movie'
                    final_type = 'movie'
                else:
                    # Ha nincs NFO, akkor jöhet a találgatás
                    fn_type = fn.get('type')
                    fd_type = fd.get('type')
                    
                    # Fix common 1080p -> S10E80 trap
                    if fn.get('season') == 10 and fn.get('episode') == 80:
                        fn_type = 'movie'
                        item.fn_season = None
                        item.fn_episode = None
                    
                    # 2. Folder metadata is usually more reliable for scene releases
                    if fd_type == 'movie' and fd.get('year'):
                        # Ha a mappában van évszám és filmnek tűnik, az nagyon erős jel
                        final_type = 'movie'
                    elif fn_type == 'episode' and not fd.get('year'):
                        # Csak akkor hiszünk a fájlnév epizód-tippjének, ha a mappában nincs évszám
                        final_type = 'episode'
                    elif fd_type == 'episode':
                        final_type = 'episode'
                    elif fn_type == 'movie' or fd_type == 'movie':
                        final_type = 'movie'
                    
                    # Final correction: If folder has a year and is a movie, clear filename's episode/season filth
                    if final_type == 'movie' and fd.get('year'):
                        item.fn_season = None
                        item.fn_episode = None
                    
                    if final_type == 'movie':
                        item.item_type = ItemType.MOVIE
                    elif final_type == 'episode':
                        item.item_type = ItemType.EPISODE
                    else:
                        item.item_type = ItemType.MOVIE # Default fallback
                    
                    item.fn_item_type = fn_type
                    item.fd_item_type = fd_type
                
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
                
                # --- Group Hash (for Collision Detection) ---
                title_for_hash = item.fn_title or item.fd_title or item.folder_name or ""
                year_for_hash = item.fn_year or item.fd_year or ""
                season_for_hash = item.fn_season or ""
                
                # Epizód hash kezelése (lista esetén is)
                ep_val = fn.get('episode')
                if isinstance(ep_val, list):
                    ep_hash = "-".join(map(str, sorted(ep_val)))
                else:
                    ep_hash = str(ep_val) if ep_val is not None else ""

                # Normalize title: lowercase, alphanumeric only
                import re
                clean_title = re.sub(r'[^a-z0-9]', '', title_for_hash.lower())
                
                # Konstruáljunk egy egyedi kulcsot szeparátorokkal
                # Pl: stargatesg1|1997|1|1-2
                hash_key = f"{clean_title}|{year_for_hash}|{season_for_hash}|{ep_hash}"
                
                if clean_title:
                    item.group_hash = hashlib.md5(hash_key.encode()).hexdigest()
                
                # --- Folder data (FD) ---
                fd = triple.get("fd", {})
                item.fd_title = self._reconstruct_movie_title(fd, item.folder_name)
                item.fd_year = fd.get('year')
                item.fd_season = fd.get('season')
                item.fd_episode = str(fd.get('episode')) if fd.get('episode') else None
                item.fd_item_type = fd.get('type')
                
                # C. Generate Planned Path (Lite)
                lite_ctx = {
                    "title": item.fn_title or item.fd_title or item.filename,
                    "year": str(item.fn_year or item.fd_year or ""),
                    "resolution": item.resolution or "",
                    "ext": item.extension or ""
                }
                if item.fn_season or item.fn_episode:
                    lite_ctx["series_title"] = lite_ctx["title"]
                    lite_ctx["season"] = self.formatter.format_number(item.fn_season or "1")
                    lite_ctx["episode"] = self.formatter.format_number(item.fn_episode or "0")
                    item.planned_path = self.formatter.format_episode_filename(lite_ctx)
                else:
                    item.planned_path = self.formatter.format_movie_filename(lite_ctx)

                # D. Language for extras
                for extra in item.extras:
                    if extra.category in [ExtraCategory.SUBTITLE, ExtraCategory.AUDIO]:
                        extra.language = self.analyzer.extract_language(extra.original_path)
                
                # Az állapotot itt nem bántjuk, mert a következő fázisban a Resolver (TMDB) dönti el a végeredményt!

                local_db.commit()
            except Exception as e:
                import traceback
                logger.error(f"Error enriching item ID {item_id}: {e}")
                logger.error(traceback.format_exc())
                local_db.rollback()
            finally:
                scan_status["current"] += 1
                DbSession.remove()

        with ThreadPoolExecutor(max_workers=10) as executor:
            list(executor.map(process_item_metadata_task, item_ids))

        logger.info("Enrichment complete.")

    def resolve_all(self, items: List[MediaItem]):
        """
        Performs online metadata resolution using TMDB/IMDb.
        """
        if not items:
            return

        logger.info(f"Phase 4: API Metadata Resolution for {len(items)} items...")
        scan_status.update({"phase": "resolving", "total": len(items), "current": 0})

        item_ids = [item.id for item in items]

        def resolve_task(item_id: int):
            local_db = DbSession()
            try:
                item = local_db.query(MediaItem).filter(MediaItem.id == item_id).first()
                if not item:
                    return
                
                # Futtassuk a Resolvert
                resolver = Resolver(local_db)
                resolver.resolve_item(item)
                resolver.propagate_match(item)
                
                # Ha sikeres a találat (automatikus egyezés), rögtön töltsük le a mély metaadatokat
                if item.status == ItemStatus.MATCHED:
                    from .metadata_enricher import MetadataEnricher
                    enricher = MetadataEnricher(local_db)
                    enricher.enrich_matched_item(item)

                
            except Exception as e:
                import traceback
                logger.error(f"Error resolving item ID {item_id}: {e}")
                logger.error(traceback.format_exc())
            finally:
                scan_status["current"] += 1
                DbSession.remove()

        # ThreadPool a hálózati kérésekhez (limitálva a rate limit elkerülésére)
        with ThreadPoolExecutor(max_workers=5) as executor:
            list(executor.map(resolve_task, item_ids))

        logger.info("Resolution complete.")
