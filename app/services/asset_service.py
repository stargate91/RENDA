import logging
import requests
from pathlib import Path
from typing import Optional
from PIL import Image

logger = logging.getLogger(__name__)

class AssetService:
    """
    Service for managing media assets: downloading, storage, and processing (thumbnails).
    """
    TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/"

    def __init__(self, storage_root: str = "./data"):
        self.storage_root = Path(storage_root)
        self.image_path = self.storage_root / "media" / "images"
        self._ensure_folders()
        
        self.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(max_retries=3)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def _ensure_folders(self):
        """Creates the necessary subdirectories for assets."""
        folders = ["posters", "backdrops", "persons", "stills", "thumbnails"]
        for folder in folders:
            (self.image_path / folder).mkdir(parents=True, exist_ok=True)

    def download_image(self, tmdb_path: str, subfolder: str, size: str = "original") -> Optional[str]:
        """
        Downloads an image from TMDB and returns the local relative path.
        """
        if not tmdb_path:
            return None

        filename = tmdb_path.lstrip("/")
        local_file_path = self.image_path / subfolder / filename
        
        if local_file_path.exists() and local_file_path.stat().st_size > 100:
            return str(local_file_path)

        url = f"{self.TMDB_IMAGE_BASE}{size}{tmdb_path}"
        headers = {"User-Agent": "Renda Media Manager/1.0"}
        
        try:
            response = self.session.get(url, stream=True, timeout=(5, 30), headers=headers)
            if response.status_code == 200:
                content_type = response.headers.get("Content-Type", "")
                if "image" not in content_type.lower():
                    logger.error(f"Invalid content type for {url}: {content_type}")
                    return None

                with open(local_file_path, 'wb') as f:
                    for chunk in response.iter_content(8192):
                        f.write(chunk)
                
                if local_file_path.stat().st_size < 100:
                    logger.error(f"Downloaded file too small: {url}")
                    local_file_path.unlink(missing_ok=True)
                    return None

                return str(local_file_path)
            else:
                logger.error(f"Image download failed ({url}): HTTP {response.status_code}")
        except Exception as e:
            logger.error(f"Image download exception ({url}): {e}")
            if local_file_path.exists():
                local_file_path.unlink(missing_ok=True)
        
        return None

    def generate_thumbnail(self, source_path: str, width: int = 300) -> Optional[str]:
        """Generates a small WebP thumbnail for fast UI preview."""
        try:
            src = Path(source_path)
            if not src.exists():
                return None
            
            thumb_filename = src.stem + "_thumb.webp"
            thumb_path = self.image_path / "thumbnails" / thumb_filename
            
            if thumb_path.exists():
                return str(thumb_path)
            
            with Image.open(src) as img:
                # Maintain aspect ratio
                w_percent = (width / float(img.size[0]))
                h_size = int((float(img.size[1]) * float(w_percent)))
                img = img.resize((width, h_size), Image.Resampling.LANCZOS)
                img.save(thumb_path, "WEBP", quality=80)
            
            return str(thumb_path)
        except Exception as e:
            logger.error(f"Thumbnail generation failed ({source_path}): {e}")
            # If image is corrupt, delete source to force re-download
            try:
                if Path(source_path).exists():
                    Path(source_path).unlink()
            except: pass
            return None
