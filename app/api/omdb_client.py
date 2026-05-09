import requests
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from ..db.models import UserSetting

logger = logging.getLogger(__name__)

class OMDBClient:
    """
    OMDb API kliens az IMDb és Rotten Tomatoes értékelésekhez.
    """
    BASE_URL = "http://www.omdbapi.com/"

    def __init__(self, db_session: Session):
        self.db = db_session
        self._api_key = self._get_api_key()

    def _get_api_key(self) -> str:
        setting = self.db.query(UserSetting).filter(UserSetting.key == "omdb_api_key").first()
        return setting.value if setting else ""

    def get_ratings(self, imdb_id: str) -> Dict[str, Any]:
        """
        Lekéri az értékeléseket IMDb ID alapján.
        """
        if not self._api_key or not imdb_id:
            return {}

        params = {
            "apikey": self._api_key,
            "i": imdb_id,
            "plot": "short"
        }
        try:
            response = requests.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("Response") == "False":
                logger.warning(f"OMDb hiba: {data.get('Error')}")
                return {}

            # Értékelések kinyerése
            ratings = {
                "imdb_rating": data.get("imdbRating"),
                "imdb_votes": data.get("imdbVotes"),
                "metascore": data.get("Metascore"),
                "rotten_tomatoes": None
            }
            
            # Rotten Tomatoes keresése a listában
            for r in data.get("Ratings", []):
                if r["Source"] == "Rotten Tomatoes":
                    ratings["rotten_tomatoes"] = r["Value"]
            
            return ratings
        except Exception as e:
            logger.error(f"OMDb API hiba ({imdb_id}): {e}")
            return {}
