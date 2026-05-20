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

    def _generate_cache_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """Generates a unique key for the request based on endpoint and parameters."""
        # Remove api_key from params to keep cache clean and portable
        p = params.copy()
        p.pop('api_key', None)
        sorted_params = sorted(p.items())
        param_str = "&".join(f"{k}={v}" for k, v in sorted_params)
        return f"{endpoint}?{param_str}"

    def _get_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieves non-expired cache from the database."""
        from datetime import datetime, timedelta
        
        # Check cache (expire after 30 days)
        cache_item = self.db.query(TMDBCache).filter(TMDBCache.cache_key == cache_key).first()
        if cache_item:
            if datetime.utcnow() - cache_item.updated_at < timedelta(days=30):
                return cache_item.raw_data
        return None

    def _set_cache(self, cache_key: str, data: Dict[str, Any]):
        """Stores API response in the persistent cache."""
        try:
            # Use SQLite upsert logic (manual check for simplicity with Session)
            cache_item = self.db.query(TMDBCache).filter(TMDBCache.cache_key == cache_key).first()
            if not cache_item:
                cache_item = TMDBCache(cache_key=cache_key)
                self.db.add(cache_item)
            
            cache_item.raw_data = data
            cache_item.tmdb_id = data.get('id') if isinstance(data, dict) else None
            cache_item.target_language = data.get('language', 'en') if isinstance(data, dict) else 'en'
            cache_item.updated_at = datetime.utcnow()
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            # We don't want cache failures to break the app
            pass

    def _call_api(self, endpoint: str, params: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        """
        Central API caller with Caching and Rate Limit (429) handling.
        """
        import time
        import logging
        logger = logging.getLogger("renda")
        
        # Ensure API key
        if 'api_key' not in params:
            params['api_key'] = self._api_key

        # 1. Check Cache
        cache_key = self._generate_cache_key(endpoint, params)
        cached_data = self._get_cache(cache_key)
        if cached_data:
            return cached_data

        # 2. Network Request
        url = self.BASE_URL + endpoint
        for attempt in range(max_retries):
            try:
                response = requests.get(url, params=params, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    self._set_cache(cache_key, data)
                    return data
                
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 1))
                    logger.warning(f"TMDB Rate Limit (429). Waiting {retry_after}s...")
                    time.sleep(retry_after)
                    continue
                
                response.raise_for_status()
                
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"TMDB API Error ({endpoint}): {e}")
                    return {}
                time.sleep(2 ** attempt)
        
        return {}
        
        return {}

    def search(self, query: str, item_type: str = "movie", year: Optional[int] = None, language: str = "en-US", include_adult: bool = False) -> List[Dict[str, Any]]:
        """Keresés TMDB-n (Film vagy Sorozat)."""
        if not self._api_key or not query:
            return []

        endpoint = "/search/movie" if item_type == "movie" else "/search/tv"
        params = {
            "api_key": self._api_key,
            "query": query,
            "language": language,
            "include_adult": "true" if include_adult else "false"
        }
        if year:
            key = "primary_release_year" if item_type == "movie" else "first_air_date_year"
            params[key] = year

        data = self._call_api(endpoint, params)
        return data.get("results", [])

    def search_person(self, query: str, language: str = "en-US", include_adult: bool = False) -> List[Dict[str, Any]]:
        """Keresés a színészek/rendezők között a TMDB-n."""
        if not self._api_key or not query:
            return []

        endpoint = "/search/person"
        params = {
            "api_key": self._api_key,
            "query": query,
            "language": language,
            "include_adult": "true" if include_adult else "false"
        }
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
            "append_to_response": "credits,external_ids,images,translations,videos"
        }
        return self._call_api(endpoint, params)

    def get_episode_details(self, series_id: int, season_number: int, episode_number: int, language: str = "en-US") -> Dict[str, Any]:
        """Egy konkrét epizód részleteinek lekérése."""
        if not self._api_key: return {}

        endpoint = f"/tv/{series_id}/season/{season_number}/episode/{episode_number}"
        params = {
            "api_key": self._api_key,
            "language": language,
            "append_to_response": "credits,external_ids,images,translations,videos"
        }
        return self._call_api(endpoint, params)

    def get_season_details(self, series_id: int, season_number: int, language: str = "en-US") -> Dict[str, Any]:
        """Egy teljes szezon lekérése."""
        if not self._api_key: return {}

        endpoint = f"/tv/{series_id}/season/{season_number}"
        params = {
            "api_key": self._api_key,
            "language": language,
            "append_to_response": "external_ids,videos"
        }
        return self._call_api(endpoint, params)

    def get_person_images(self, person_id: int) -> Dict[str, Any]:
        """Lekéri egy színész/készítő összes elérhető profilképét."""
        if not self._api_key: return {}
        
        endpoint = f"/person/{person_id}/images"
        params = {"api_key": self._api_key}
        return self._call_api(endpoint, params)

    def get_person_details(self, person_id: int, language: str = "en-US") -> Dict[str, Any]:
        """Lekéri egy színész/készítő részletes adatait."""
        if not self._api_key: return {}
        
        endpoint = f"/person/{person_id}"
        params = {
            "api_key": self._api_key,
            "language": language,
            "append_to_response": "images,translations,external_ids,combined_credits"
        }
        return self._call_api(endpoint, params)

    def get_trending(self, media_type: str = "all", time_window: str = "day", language: str = "en-US") -> List[Dict[str, Any]]:
        """Lekéri a napi/heti trending filmeket/sorozatokat."""
        if not self._api_key: return []
        
        endpoint = f"/trending/{media_type}/{time_window}"
        params = {
            "api_key": self._api_key,
            "language": language
        }
        data = self._call_api(endpoint, params)
        return data.get("results", [])

    def discover(self, media_type: str = "movie", with_genres: Optional[str] = None, language: str = "en-US", page: int = 1) -> List[Dict[str, Any]]:
        """Lekéri a filmeket/sorozatokat különböző szűrők alapján (pl. műfaj)."""
        if not self._api_key: return []

        endpoint = f"/discover/{media_type}"
        params = {
            "api_key": self._api_key,
            "language": language,
            "page": page,
            "sort_by": "popularity.desc"
        }
        if with_genres:
            params["with_genres"] = with_genres

        data = self._call_api(endpoint, params)
        return data.get("results", [])
