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
        """Creates the necessary subdirectories for different image types."""
        for folder in ["posters", "backdrops", "persons", "stills"]:
            (self.storage_path / folder).mkdir(parents=True, exist_ok=True)

    def download_image(self, tmdb_path: str, subfolder: str, size: str = "original") -> Optional[str]:
        """
        Downloads an image from TMDB and returns the local relative path.
        Includes basic caching by checking for existing files.
        """
        if not tmdb_path:
            return None

        filename = tmdb_path.lstrip("/")
        local_file_path = self.storage_path / subfolder / filename
        
        if local_file_path.exists():
            return str(local_file_path)

        url = f"{self.BASE_URL}{size}{tmdb_path}"
        
        try:
            response = requests.get(url, stream=True, timeout=10)
            if response.status_code == 200:
                with open(local_file_path, 'wb') as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
                return str(local_file_path)
        except Exception as e:
            print(f"Hiba a kép letöltésekor ({url}): {e}")
        
        return None

    def process_all(self, max_workers: int = 5):
        """
        Végrehajtja az összes letöltést párhuzamosan.
        """
        from concurrent.futures import ThreadPoolExecutor
        
        logger.info(f"ImageWorker: Letöltési folyamat indítása ({max_workers} szálon)...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 1. Média képek (Posters, Stills)
            self.process_pending_media(executor)
            
            # 2. Személyek profilképei
            self.process_pending_persons(executor)
        
        logger.info("ImageWorker: Minden várakozó feladat feldolgozva.")

    def process_pending_media(self, executor):
        """Feldolgozza a várakozó film/sorozat képeket batch-ekben."""
        # Memória-barát: egyszerre csak 50 elemet töltünk be
        while True:
            matches = self.db.query(MediaMatch).filter(
                MediaMatch.image_status == ImageStatus.PENDING
            ).limit(50).all()
            
            if not matches:
                break

            # Letöltési feladatok beküldése a pool-ba
            futures = []
            for match in matches:
                match.image_status = ImageStatus.DOWNLOADING
                futures.append(executor.submit(self._download_match_images, match))
            
            self.db.commit()
            
            # Megvárjuk az aktuális batch végét
            for future in futures:
                future.result()

    def _download_match_images(self, match: MediaMatch):
        """Egyetlen médiaelem összes képének letöltése (szálon fut)."""
        success = False
        try:
            for loc in match.localizations:
                # A. POSZTEREK
                if loc.poster_path and not loc.local_poster_path:
                    local_p = self.download_image(loc.poster_path, "posters", size="w500")
                    if local_p:
                        loc.local_poster_path = local_p
                        success = True
                
                if loc.series_poster_path and not loc.local_series_poster_path:
                    local_sp = self.download_image(loc.series_poster_path, "posters", size="w500")
                    if local_sp:
                        loc.local_series_poster_path = local_sp
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
            logger.error(f"Hiba a match képeinek letöltésekor (ID: {match.id}): {e}")
            self.db.rollback()

    def process_pending_persons(self, executor):
        """Feldolgozza a várakozó személyek képeit batch-ekben."""
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
        """Egyetlen személy képének letöltése (szálon fut)."""
        try:
            if person.profile_path and not person.local_profile_path:
                local_path = self.download_image(person.profile_path, "persons", size="h632")
                if local_path:
                    person.local_profile_path = local_path
                    person.image_status = ImageStatus.COMPLETED
                else:
                    person.image_status = ImageStatus.FAILED
            else:
                person.image_status = ImageStatus.COMPLETED # Ha nincs kép, késznek jelöljük
            
            self.db.commit()
        except Exception as e:
            logger.error(f"Hiba a személy kép letöltésekor (ID: {person.id}): {e}")
            self.db.rollback()
