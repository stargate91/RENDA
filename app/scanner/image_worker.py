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
        
        try:
            response = requests.get(url, stream=True, timeout=15)
            if response.status_code == 200:
                with open(local_file_path, 'wb') as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
                return str(local_file_path)
        except Exception as e:
            logger.error(f"Image download failed ({url}): {e}")
        
        return None

    def process_all(self, max_workers: int = 5):
        """Executes all pending downloads and processing in parallel."""
        from concurrent.futures import ThreadPoolExecutor
        
        logger.info(f"ImageWorker: Starting download process ({max_workers} threads)...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 1. Media assets (Posters, Stills)
            self.process_pending_media(executor)
            
            # 2. People profiles
            self.process_pending_persons(executor)
        
        logger.info("ImageWorker: All pending tasks completed.")

    def process_pending_media(self, executor):
        """Processes pending movie/series images in batches."""
        while True:
            matches = self.db.query(MediaMatch).filter(
                MediaMatch.image_status == ImageStatus.PENDING
            ).limit(50).all()
            
            if not matches:
                break

            futures = []
            for match in matches:
                match.image_status = ImageStatus.DOWNLOADING
                futures.append(executor.submit(self._download_match_images, match))
            
            self.db.commit()
            
            for future in futures:
                future.result()

    def _download_match_images(self, match: MediaMatch):
        """Downloads all images for a single media match (threaded)."""
        success = False
        try:
            for loc in match.localizations:
                # A. POSTERS & THUMBNAILS
                if loc.poster_path and not loc.local_poster_path:
                    local_p = self.download_image(loc.poster_path, "posters", size="w500")
                    if local_p:
                        loc.local_poster_path = local_p
                        # Generate thumbnail immediately
                        loc.local_thumb_path = self._generate_thumbnail(local_p)
                        success = True
                
                if loc.series_poster_path and not loc.local_series_poster_path:
                    local_sp = self.download_image(loc.series_poster_path, "posters", size="w500")
                    if local_sp:
                        loc.local_series_poster_path = local_sp
                        if not loc.local_thumb_path: # Prefer movie poster for thumb, but use series if only one exists
                            loc.local_thumb_path = self._generate_thumbnail(local_sp)
                        success = True

                # B. STILLS
                if loc.still_path and not loc.local_still_path:
                    local_s = self.download_image(loc.still_path, "stills", size="w400")
                    if local_s:
                        loc.local_still_path = local_s
                        success = True

            match.image_status = ImageStatus.COMPLETED if success else ImageStatus.FAILED
            self.db.commit()
        except Exception as e:
            logger.error(f"Error downloading images for match ID {match.id}: {e}")
            self.db.rollback()

    def process_pending_persons(self, executor):
        """Processes pending person profiles in batches."""
        while True:
            persons = self.db.query(Person).filter(
                Person.image_status == ImageStatus.PENDING
            ).limit(100).all()
            
            if not persons:
                break

            futures = []
            for person in persons:
                person.image_status = ImageStatus.DOWNLOADING
                futures.append(executor.submit(self._download_person_image, person))
            
            self.db.commit()
            
            for future in futures:
                future.result()

    def _download_person_image(self, person: Person):
        """Downloads a single person's profile image (threaded)."""
        try:
            if person.profile_path and not person.local_profile_path:
                local_path = self.download_image(person.profile_path, "persons", size="h632")
                if local_path:
                    person.local_profile_path = local_path
                    person.image_status = ImageStatus.COMPLETED
                else:
                    person.image_status = ImageStatus.FAILED
            else:
                person.image_status = ImageStatus.COMPLETED
            
            self.db.commit()
        except Exception as e:
            logger.error(f"Error downloading person image (ID: {person.id}): {e}")
            self.db.rollback()
