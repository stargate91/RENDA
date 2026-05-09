import requests
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..db.models import TMDBCache, ItemType, UserSetting
from datetime import datetime

class TMDBClient:
    """
    TMDB API Kliens beépített gyorsítótárral (Cache).
    """
    BASE_URL = "https://api.themoviedb.org/3"

    def __init__(self, db_session: Session):
        self.db = db_session
        self._api_key = self._get_api_key()

    def _get_api_key(self) -> str:
        """Kinyeri az API kulcsot a beállításokból."""
        setting = self.db.query(UserSetting).filter(UserSetting.key == "tmdb_api_key").first()
        return setting.value if setting else ""

    def _get_cache(self, query: str, item_type: ItemType, language: str) -> Optional[Dict[str, Any]]:
        """Megnézi, van-e már ilyen keresés a cache-ben."""
        # Megjegyzés: A tmdb_cache táblában a tmdb_id-t használjuk, de keresésnél 
        # a query-t is tárolhatnánk. Egyelőre a raw_data-ban tároljuk a keresési eredményeket is.
        # Egyszerűség kedvéért a kereséseket egy speciális 'search' típusú cache-ként kezeljük.
        pass # Később implementáljuk a finomhangolt cache-t

    def _call_api(self, endpoint: str, params: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        """Központi API hívó metódus Retry-After kezeléssel."""
        import time
        
        url = self.BASE_URL + endpoint
        
        for attempt in range(max_retries):
            try:
                response = requests.get(url, params=params, timeout=15)
                
                if response.status_code == 429:
                    # Rate limit elérve
                    retry_after = int(response.headers.get("Retry-After", 1))
                    logger.warning(f"TMDB Rate Limit (429). Várakozás {retry_after} mp-et...")
                    time.sleep(retry_after)
                    continue
                
                response.raise_for_status()
                return response.json()
                
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"TMDB API hiba ({endpoint}): {e}")
                    return {}
                time.sleep(1 * (attempt + 1)) # Exponenciális várakozás
        
        return {}

    def search(self, query: str, item_type: str = "movie", year: Optional[int] = None, language: str = "en-US") -> List[Dict[str, Any]]:
        """Keresés TMDB-n (Film vagy Sorozat)."""
        if not self._api_key or not query:
            return []

        endpoint = "/search/movie" if item_type == "movie" else "/search/tv"
        params = {
            "api_key": self._api_key,
            "query": query,
            "language": language,
            "include_adult": "true"
        }
        if year:
            key = "primary_release_year" if item_type == "movie" else "first_air_date_year"
            params[key] = year

        data = self._call_api(endpoint, params)
        return data.get("results", [])

    def find_by_imdb(self, imdb_id: str, language: str = "en-US") -> Optional[Dict[str, Any]]:
        """Azonosítás IMDb ID alapján."""
        if not self._api_key or not imdb_id:
            return None

        params = {
            "api_key": self._api_key,
            "external_source": "imdb_id",
            "language": language
        }
        data = self._call_api(f"/find/{imdb_id}", params)
        
        movies = data.get("movie_results", [])
        tv = data.get("tv_results", [])
        
        if movies: return {**movies[0], "item_type": "movie"}
        if tv: return {**tv[0], "item_type": "series"}
        return None

    def get_details(self, tmdb_id: int, item_type: str, language: str = "en-US") -> Dict[str, Any]:
        """Részletes adatok lekérése."""
        if not self._api_key: return {}

        endpoint = f"/movie/{tmdb_id}" if item_type == "movie" else f"/tv/{tmdb_id}"
        params = {
            "api_key": self._api_key,
            "language": language,
            "append_to_response": "credits,external_ids,images,translations"
        }
        return self._call_api(endpoint, params)

    def get_episode_details(self, series_id: int, season_number: int, episode_number: int, language: str = "en-US") -> Dict[str, Any]:
        """Egy konkrét epizód részleteinek lekérése."""
        if not self._api_key: return {}

        endpoint = f"/tv/{series_id}/season/{season_number}/episode/{episode_number}"
        params = {
            "api_key": self._api_key,
            "language": language,
            "append_to_response": "credits,external_ids,images,translations"
        }
        return self._call_api(endpoint, params)

    def get_season_details(self, series_id: int, season_number: int, language: str = "en-US") -> Dict[str, Any]:
        """Egy teljes szezon lekérése."""
        if not self._api_key: return {}

        endpoint = f"/tv/{series_id}/season/{season_number}"
        params = {
            "api_key": self._api_key,
            "language": language,
            "append_to_response": "external_ids"
        }
        return self._call_api(endpoint, params)
