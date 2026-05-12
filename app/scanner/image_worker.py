import os
import requests
from typing import Optional, List
from pathlib import Path
from sqlalchemy.orm import Session
from ..db.models import MediaMatch, MetadataLocalization, Person, ImageStatus
from ..utils.logger import logger

class ImageWorker:
    """
    Background engine for downloading media assets (posters, backdrops, etc.).
    Supports parallel downloads and memory-efficient batch processing.
    """

    BASE_URL = "https://image.tmdb.org/t/p/"
    
    def __init__(self, db_session: Session, storage_path: str):
        self.db = db_session
        self.storage_path = Path(storage_path) / "media" / "images"
        self._ensure_folders()
        self._reset_stale_tasks()
        
        # Central session with retries
        self.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(max_retries=3)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def _reset_stale_tasks(self):
        """Resets any stuck 'DOWNLOADING' tasks back to 'PENDING' on startup."""
        try:
            self.db.query(MediaMatch).filter(MediaMatch.image_status == ImageStatus.DOWNLOADING).update({"image_status": ImageStatus.PENDING})
            self.db.query(MediaMatch).filter(MediaMatch.backdrop_status == ImageStatus.DOWNLOADING).update({"backdrop_status": ImageStatus.PENDING})
            self.db.query(Person).filter(Person.image_status == ImageStatus.DOWNLOADING).update({"image_status": ImageStatus.PENDING})
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to reset stale image tasks: {e}")
            self.db.rollback()

    def _ensure_folders(self):
        """Creates the necessary subdirectories for different image types and thumbnails."""
        for folder in ["posters", "backdrops", "persons", "stills", "thumbnails"]:
            (self.storage_path / folder).mkdir(parents=True, exist_ok=True)

    def _generate_thumbnail(self, source_path: str) -> Optional[str]:
        """Generates a small WebP thumbnail for fast UI preview."""
        try:
            from PIL import Image
            src = Path(source_path)
            if not src.exists():
                return None
            
            thumb_filename = src.stem + "_thumb.webp"
            thumb_path = self.storage_path / "thumbnails" / thumb_filename
            
            if thumb_path.exists():
                return str(thumb_path)
            
            with Image.open(src) as img:
                # Maintain aspect ratio, max width 300px
                width = 300
                w_percent = (width / float(img.size[0]))
                h_size = int((float(img.size[1]) * float(w_percent)))
                img = img.resize((width, h_size), Image.Resampling.LANCZOS)
                img.save(thumb_path, "WEBP", quality=80)
            
            return str(thumb_path)
        except Exception as e:
            logger.error(f"Thumbnail generation failed ({source_path}): {e}")
            # Ha nem sikerült azonosítani a képet, töröljük a forrást, hogy legközelebb újratöltse
            try:
                if source_path.exists():
                    source_path.unlink()
            except: pass
            return None

    def download_image(self, tmdb_path: str, subfolder: str, size: str = "original") -> Optional[str]:
        """
        Downloads an image from TMDB and returns the local relative path.
        """
        if not tmdb_path:
            return None

        filename = tmdb_path.lstrip("/")
        local_file_path = self.storage_path / subfolder / filename
        
        if local_file_path.exists():
            return str(local_file_path)

        url = f"{self.BASE_URL}{size}{tmdb_path}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        
        try:
            response = self.session.get(url, stream=True, timeout=(5, 20), headers=headers)
            if response.status_code == 200:
                # Verify it's actually an image
                content_type = response.headers.get("Content-Type", "")
                if "image" not in content_type.lower():
                    logger.error(f"Invalid content type for {url}: {content_type}")
                    return None

                with open(local_file_path, 'wb') as f:
                    for chunk in response.iter_content(4096):
                        f.write(chunk)
                
                # Double check file size - images shouldn't be tiny (e.g. < 100 bytes)
                if local_file_path.stat().st_size < 100:
                    logger.error(f"Downloaded file too small for {url}")
                    local_file_path.unlink(missing_ok=True)
                    return None

                return str(local_file_path)
            else:
                logger.error(f"Image download failed ({url}): HTTP {response.status_code}")
        except Exception as e:
            logger.error(f"Image download failed ({url}): {e}")
            if local_file_path.exists():
                local_file_path.unlink(missing_ok=True)
        
        return None

    def process_all(self, max_workers: int = 5):
        """Executes all pending downloads and processing in parallel."""
        from concurrent.futures import ThreadPoolExecutor
        
        logger.info(f"ImageWorker: Starting download process ({max_workers} threads)...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 1. Media assets (Posters, Stills)
            self.process_pending_media(executor)
            
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 2. People primary profiles (Top 20 + Creators)
            self.process_pending_persons(executor)
            
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 3. Backdrops (Large images)
            self.process_pending_backdrops(executor)
            
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 4. People alternate profiles (Remaining images for top actors)
            self.process_person_alternate_images(executor)
        
        logger.info("ImageWorker: All pending tasks completed.")

    def process_pending_media(self, executor):
        """Processes pending movie/series images in batches."""
        while True:
            matches = self.db.query(MediaMatch.id).filter(
                MediaMatch.image_status == ImageStatus.PENDING
            ).limit(50).all()
            
            if not matches:
                break

            match_ids = [m[0] for m in matches]
            
            # Mark as DOWNLOADING in the main thread
            self.db.query(MediaMatch).filter(MediaMatch.id.in_(match_ids)).update(
                {"image_status": ImageStatus.DOWNLOADING}, synchronize_session=False
            )
            self.db.commit()

            futures = []
            for mid in match_ids:
                futures.append(executor.submit(self._download_match_images, mid))
            
            for future in futures:
                future.result()

    def _download_match_images(self, match_id: int):
        """Downloads all images for a single media match (threaded)."""
        from ..db.base import Session as DbSession
        local_db = DbSession()
        try:
            match = local_db.query(MediaMatch).filter(MediaMatch.id == match_id).first()
            if not match:
                return
                
            success = False
            for loc in match.localizations:
                has_any_path = False
                
                # A. POSTERS & THUMBNAILS
                if loc.poster_path:
                    has_any_path = True
                    if not loc.local_poster_path:
                        local_p = self.download_image(loc.poster_path, "posters", size="w500")
                        if local_p:
                            loc.local_poster_path = local_p
                            loc.local_thumb_path = self._generate_thumbnail(local_p)
                            success = True
                    else:
                        success = True
                
                if loc.series_poster_path:
                    has_any_path = True
                    if not loc.local_series_poster_path:
                        local_sp = self.download_image(loc.series_poster_path, "posters", size="w500")
                        if local_sp:
                            loc.local_series_poster_path = local_sp
                            if not loc.local_thumb_path:
                                loc.local_thumb_path = self._generate_thumbnail(local_sp)
                            success = True
                    else:
                        success = True

                # B. STILLS
                if loc.still_path:
                    has_any_path = True
                    if not loc.local_still_path:
                        local_s = self.download_image(loc.still_path, "stills", size="w400")
                        if local_s:
                            loc.local_still_path = local_s
                            success = True
                    else:
                        success = True
                
                # C. ALL STILLS (Galéria a több részes epizódokhoz)
                if loc.all_stills:
                    has_any_path = True
                    local_stills = list(loc.local_all_stills or [])
                    updated_stills = False
                    
                    for s_path in loc.all_stills:
                        # Megnézzük, le van-e már töltve ez a kép
                        filename = s_path.lstrip("/")
                        if any(filename in str(ls) for ls in local_stills):
                            continue
                            
                        local_s = self.download_image(s_path, "stills", size="w400")
                        if local_s:
                            local_stills.append(local_s)
                            updated_stills = True
                            success = True
                    
                    if updated_stills:
                        loc.local_all_stills = local_stills
                        
                if not has_any_path:
                    success = True # Nincs mit letölteni, ez önmagában siker

            match.image_status = ImageStatus.COMPLETED if success else ImageStatus.FAILED
            local_db.commit()
        except Exception as e:
            logger.error(f"Error downloading images for match ID {match_id}: {e}")
            local_db.rollback()
        finally:
            local_db.close()

    def process_pending_backdrops(self, executor):
        """Processes pending backdrops (large images) in batches."""
        while True:
            matches = self.db.query(MediaMatch.id).filter(
                MediaMatch.backdrop_status == ImageStatus.PENDING
            ).limit(50).all()
            
            if not matches:
                break

            match_ids = [m[0] for m in matches]
            
            self.db.query(MediaMatch).filter(MediaMatch.id.in_(match_ids)).update(
                {"backdrop_status": ImageStatus.DOWNLOADING}, synchronize_session=False
            )
            self.db.commit()

            futures = []
            for mid in match_ids:
                futures.append(executor.submit(self._download_match_backdrops, mid))
            
            for future in futures:
                future.result()

    def _download_match_backdrops(self, match_id: int):
        """Downloads only the wide backdrop image for a match."""
        from ..db.base import Session as DbSession
        local_db = DbSession()
        try:
            match = local_db.query(MediaMatch).filter(MediaMatch.id == match_id).first()
            if not match: return
                
            success = False
            for loc in match.localizations:
                if loc.backdrop_path:
                    if not loc.local_backdrop_path:
                        local_b = self.download_image(loc.backdrop_path, "backdrops", size="w1280")
                        if local_b:
                            loc.local_backdrop_path = local_b
                            success = True
                    else:
                        success = True
                else:
                    success = True

            match.backdrop_status = ImageStatus.COMPLETED if success else ImageStatus.FAILED
            local_db.commit()
        except Exception as e:
            logger.error(f"Error downloading backdrops for match ID {match_id}: {e}")
            local_db.rollback()
        finally:
            local_db.close()

    def process_pending_persons(self, executor):
        """Processes pending person profiles in batches (Primary image)."""
        from ..db.models import Person, MediaPersonLink
        while True:
            persons = self.db.query(Person.id).filter(
                Person.image_status == ImageStatus.PENDING
            ).limit(100).all()
            
            if not persons:
                break

            person_ids = [p[0] for p in persons]
            
            self.db.query(Person).filter(Person.id.in_(person_ids)).update(
                {"image_status": ImageStatus.DOWNLOADING}, synchronize_session=False
            )
            self.db.commit()

            futures = []
            for pid in person_ids:
                futures.append(executor.submit(self._download_person_image, pid))
            
            for future in futures:
                future.result()

    def process_person_alternate_images(self, executor):
        """Processes alternate images for persons."""
        from ..db.models import Person
        while True:
            # Persons that have primary image completed, but alt images not fetched yet (images == None)
            persons = self.db.query(Person.id).filter(
                Person.image_status == ImageStatus.COMPLETED,
                Person.images == None
            ).limit(50).all()
            
            if not persons:
                break
                
            person_ids = [p[0] for p in persons]
            
            # Temporary set to empty list to prevent re-querying if it crashes
            self.db.query(Person).filter(Person.id.in_(person_ids)).update(
                {"images": []}, synchronize_session=False
            )
            self.db.commit()

            futures = []
            for pid in person_ids:
                futures.append(executor.submit(self._download_person_alternate_images, pid))
                
            for future in futures:
                future.result()

    def _download_person_alternate_images(self, person_id: int):
        """Downloads additional profile pictures for a person."""
        from ..db.base import Session as DbSession
        from ..api.tmdb_client import TMDBClient
        local_db = DbSession()
        try:
            person = local_db.query(Person).filter(Person.id == person_id).first()
            if not person: return
            
            api = TMDBClient(local_db)
            data = api.get_person_images(person_id)
            profiles = data.get("profiles", [])
            
            downloaded_paths = []
            # Fetch up to 10 alternate images (excluding the primary one)
            count = 0
            for profile in profiles:
                file_path = profile.get("file_path")
                if not file_path or file_path == person.profile_path:
                    continue
                    
                local_path = self.download_image(file_path, "persons", size="h632")
                if local_path:
                    downloaded_paths.append(local_path)
                    count += 1
                
                if count >= 10:
                    break
                    
            person.images = downloaded_paths
            local_db.commit()
        except Exception as e:
            logger.error(f"Error downloading alternate person images (ID: {person_id}): {e}")
            local_db.rollback()
        finally:
            local_db.close()
    def _download_person_image(self, person_id: int):
        """Downloads a single person's profile image (threaded)."""
        from ..db.base import Session as DbSession
        local_db = DbSession()
        try:
            person = local_db.query(Person).filter(Person.id == person_id).first()
            if not person:
                return

            if person.profile_path and not person.local_profile_path:
                local_path = self.download_image(person.profile_path, "persons", size="h632")
                if local_path:
                    person.local_profile_path = local_path
                    person.image_status = ImageStatus.COMPLETED
                else:
                    person.image_status = ImageStatus.FAILED
            else:
                person.image_status = ImageStatus.COMPLETED
            
            local_db.commit()
        except Exception as e:
            logger.error(f"Error downloading person image (ID: {person_id}): {e}")
            local_db.rollback()
        finally:
            local_db.close()
