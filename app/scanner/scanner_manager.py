from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from .collector import Collector
from .categorizer import Categorizer
from .linker import Linker
from .nfo_parser import NFOParser
from .probe import TechnicalProber
from .analyzer import Analyzer
from ..db.models import MediaItem, ExtraFile, ItemType, ItemStatus, ExtraCategory
from ..utils.logger import logger

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

    def scan_and_save(self, paths: List[str]):
        """
        Phase 1: Fast scanning and basic database population.
        Implements change-detection to skip files that haven't been modified.
        """
        logger.info("Phase 1: Collecting files and establishing links...")
        files = self.collector.collect(paths)
        media_paths = files["potential_media"]
        extra_paths = files["potential_extras"]

        links = self.linker.link(media_paths, extra_paths)
        # Meglévő rekordok lekérése a duplikáció szűréshez
        existing_items = {item.original_path: item for item in self.db.query(MediaItem).all()}
        
        path_to_item = {}
        to_enrich = []

        for p in media_paths:
            stat = p.stat()
            mtime = stat.st_mtime
            size = stat.st_size
            p_str = str(p)
            
            existing = existing_items.get(p_str)
            
            if existing and existing.size == size and existing.mtime == mtime:
                # Nem változott
                path_to_item[p] = existing
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
                to_enrich.append(item)

        self.db.flush()

        for p in extra_paths:
            category, subtype = self.categorizer.categorize(p)
            parent_path = links.get(p)
            parent_item = path_to_item.get(parent_path)
            
            if parent_item:
                extra = ExtraFile(
                    parent_item_id=parent_item.id,
                    category=category, subtype=subtype,
                    original_path=str(p), current_path=str(p),
                    extension=p.suffix.lower()
                )
                self.db.add(extra)

        self.db.commit()
        
        # 2. FÁZIS: Adatgazdagítás (Enrichment)
        logger.info(f"Szkennelés kész. {len(path_to_item)} médiaelem mentve. Gazdagítás indítása...")
        self.enrich_all(to_enrich) # Csak azokat gazdagítjuk, amik újak/változtak

    def _reconstruct_movie_title(self, data: Dict[str, Any], original_text: str) -> str:
        """
        Visszarakja a levágott számokat a film címébe a megfelelő helyre.
        """
        title = data.get('title')
        # Csak akkor ragasztunk, ha film, VAGY ha epizódnak tűnik, de nincs szezonja (magányos szám)
        is_movie = data.get('type') == 'movie'
        is_lonely_episode = data.get('type') == 'episode' and not data.get('season')
        
        if not title or not (is_movie or is_lonely_episode):
            return title
            
        episode = data.get('episode')
        part = data.get('part')
        
        result = str(title)
        
        # Megnézzük, hol volt a szám az eredeti szövegben a címhez képest
        if episode:
            ep_str = str(episode)
            title_pos = original_text.lower().find(title.lower())
            ep_pos = original_text.lower().find(ep_str)
            
            if ep_pos < title_pos:
                result = f"{ep_str} {result}"
            else:
                result = f"{result} {ep_str}"
                
        if part:
            # A 'part' általában a cím után van
            result = f"{result} {part}"
            
        return result

    def enrich_all(self, items: List[MediaItem]):
        """
        Minden médiaelemhez technikai és logikai adatokat rendel.
        Optimalizált: A technikai elemzés (FFprobe) párhuzamosan fut ProcessPool-ban.
        """
        from concurrent.futures import ProcessPoolExecutor
        import os
        
        logger.info(f"Adatgazdagítás indítása {len(items)} elemhez (Parallel FFprobe)...")
        
        # 1. Technikai adatok begyűjtése párhuzamosan
        paths = [item.original_path for item in items]
        probe_results = {}
        
        # CPU magok száma alapú pool (vagy manuális limit)
        max_workers = min(os.cpu_count() or 4, 16)
        
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            # A prober.probe hívásokat elosztjuk
            # Megjegyzés: A self.prober.probe-ot nem tudjuk közvetlenül átadni, 
            # ha a TechnicalProber nem szerializálható jól, de a metódusa igen.
            futures = {executor.submit(self.prober.probe, p): p for p in paths}
            
            for future in futures:
                path = futures[future]
                try:
                    probe_results[path] = future.result()
                except Exception as e:
                    logger.error(f"FFprobe hiba: {path} -> {e}")
                    probe_results[path] = None

        # 2. Metaadatok lekérése (TMDB/Guessit) - Most már párhuzamosan (I/O bound)
        
        logger.info(f"Metadata enrichment starting for {len(items)} items (Parallel API)...")
        
        def process_item_metadata(item: MediaItem):
            try:
                p = Path(item.original_path)
                
                # NFO (IMDb ID)
                item.nfo_imdb_id = self.nfo_parser.get_imdb_id(p)
                
                # Technical data from the probe pool
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
                if not item.nfo_imdb_id:
                    triple = self.analyzer.get_triple_data(
                        item.internal_title, item.filename, item.folder_name
                    )
                    
                    # --- Filename data (FN) ---
                    fn = triple["fn"]
                    item.fn_title = self._reconstruct_movie_title(fn, item.filename)
                    item.fn_year = fn.get('year')
                    item.fn_season = fn.get('season')
                    item.fn_episode = str(fn.get('episode')) if fn.get('episode') else None
                    
                    # Type correction: standalone episodes treated as movies for better matching
                    fn_type = fn.get('type')
                    if fn_type == 'episode' and not fn.get('season'):
                        fn_type = 'movie'
                    item.fn_item_type = fn_type
                    
                    # --- Intelligent Part Detection ---
                    raw_part = fn.get('part') or fn.get('cd') or fn.get('disc') or fn.get('volume')
                    if raw_part:
                        title_lower = (item.fn_title or "").lower()
                        is_part_of_title = "part" in title_lower or "episode" in title_lower
                        has_episode_num = fn.get('episode') is not None
                        
                        if not is_part_of_title and not has_episode_num:
                            from ..db.models import PartType
                            item.fn_part = raw_part
                            item.part = raw_part
                            if 'cd' in fn: item.part_type = PartType.CD
                            elif 'disc' in fn: item.part_type = PartType.DISC
                            elif 'volume' in fn: item.part_type = PartType.VOLUME
                            else: item.part_type = PartType.PART
                    
                    # --- Group Hash (For split files like CD1/CD2) ---
                    hash_base = f"{item.fn_title or ''}{item.fn_year or ''}{item.fn_season or ''}{item.fn_episode or ''}{item.folder_name or ''}".lower().replace(" ", "")
                    if hash_base:
                        import hashlib
                        item.group_hash = hashlib.md5(hash_base.encode()).hexdigest()
                    
                    # --- Folder data (FD) ---
                    fd = triple["fd"]
                    item.fd_title = self._reconstruct_movie_title(fd, item.folder_name)
                    item.fd_year = fd.get('year')
                    item.fd_season = fd.get('season')
                    item.fd_episode = str(fd.get('episode')) if fd.get('episode') else None
                    item.fd_item_type = fd.get('type')
                    
                    # --- Internal title data (IT) ---
                    it = triple["it"]
                    if it:
                        item.it_title = self._reconstruct_movie_title(it, item.internal_title)
                        item.it_year = it.get('year')
                        item.it_season = it.get('season')
                        item.it_episode = str(it.get('episode')) if it.get('episode') else None
                        item.it_item_type = it.get('type')
                
                # Update language for extras (subtitles/audio)
                for extra in item.extras:
                    if extra.category in [ExtraCategory.SUBTITLE, ExtraCategory.AUDIO]:
                        extra.language = self.analyzer.extract_language(extra.original_path)
                
                item.status = ItemStatus.MATCHED
                return True
            except Exception as e:
                logger.error(f"Error enriching {item.filename}: {e}")
                item.status = ItemStatus.ERROR
                return False

        with ThreadPoolExecutor(max_workers=10) as executor:
            list(executor.map(process_item_metadata, items))

        self.db.commit()
        logger.info("Enrichment complete.")
