from fastapi import APIRouter
from app.db.base import Session
from app.db.models import *

router = APIRouter()

from sqlalchemy.orm import joinedload
from fastapi.responses import JSONResponse
import logging
import logging
logger = logging.getLogger(__name__)

from pydantic import BaseModel
from typing import Optional, List

class SearchRequest(BaseModel):
    query: str
    item_type: str = "movie"
    year: Optional[int] = None
    language: str = "en-US"

class MatchTarget(BaseModel):
    tmdb_id: int
    item_type: str # 'movie', 'series', 'season', 'episode'
    season: Optional[int] = None
    episode: Optional[int] = None
    episodes: Optional[List[int]] = None

class ResolveRequest(BaseModel):
    item_id: int
    targets: Optional[List[MatchTarget]] = None
    # Backward compatibility
    tmdb_id: Optional[int] = None
    item_type: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    episodes: Optional[List[int]] = None

@router.get("/metadata/search")
def search_metadata(query: str, item_type: str = "movie", year: Optional[int] = None, language: str = "en-US"):
    """Performs a manual search on TMDB."""
    db = Session()
    try:
        from app.api.tmdb_client import TMDBClient
        from app.db.models import UserSetting
        
        # Get include_adult setting
        adult_setting = db.query(UserSetting).filter(UserSetting.key == "include_adult").first()
        include_adult = adult_setting.value.lower() == "true" if adult_setting else False
        
        client = TMDBClient(db)
        results = client.search(query, item_type=item_type, year=year, language=language, include_adult=include_adult)
        return results
    finally:
        db.close()

@router.get("/metadata/tv/{tmdb_id}/seasons")
def get_tv_seasons(tmdb_id: int, language: str = "en-US"):
    """Fetches seasons for a TV series."""
    db = Session()
    try:
        from app.api.tmdb_client import TMDBClient
        client = TMDBClient(db)
        data = client.get_details(tmdb_id, item_type="tv", language=language)
        return data.get("seasons", [])
    finally:
        db.close()

@router.get("/metadata/tv/{tmdb_id}/season/{season_number}/episodes")
def get_tv_season_episodes(tmdb_id: int, season_number: int, language: str = "en-US"):
    """Fetches episodes for a TV season."""
    db = Session()
    try:
        from app.api.tmdb_client import TMDBClient
        client = TMDBClient(db)
        data = client.get_season_details(tmdb_id, season_number, language=language)
        return data.get("episodes", [])
    finally:
        db.close()

@router.post("/metadata/resolve")
def resolve_metadata(request: ResolveRequest):
    """Manually assigns a TMDB match to a MediaItem."""
    db = Session()
    try:
        from app.db.models import MediaItem, MediaMatch, ItemStatus, ItemType
        from app.scanner.metadata_enricher import MetadataEnricher
        
        item = db.query(MediaItem).filter(MediaItem.id == request.item_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found"})
            
        # 1. Deactivate existing matches
        db.query(MediaMatch).filter(MediaMatch.media_item_id == item.id).update({"is_active": False})
        
        # 2. Process targets (Grouping episodes for the same series/season)
        targets = request.targets
        if not targets and request.tmdb_id:
            # Fallback for legacy requests
            targets = [MatchTarget(
                tmdb_id=request.tmdb_id,
                item_type=request.item_type,
                season=request.season,
                episode=request.episode,
                episodes=request.episodes
            )]

        if not targets:
            return JSONResponse(status_code=400, content={"error": "No targets provided"})

        # Group TV targets by (tmdb_id, season) to support multi-episode files
        tv_groups = {} # (tmdb_id, season) -> list of episode numbers
        movie_targets = []

        for target in targets:
            if target.item_type in ["tv", "series", "episode"] and target.season is not None:
                key = (target.tmdb_id, target.season)
                if key not in tv_groups:
                    tv_groups[key] = []
                
                eps = target.episodes if (hasattr(target, 'episodes') and target.episodes) else []
                if target.episode is not None:
                    eps.append(target.episode)
                
                tv_groups[key].extend(eps)
            else:
                movie_targets.append(target)

        final_item_type = ItemType.MOVIE
        active_match = None

        # Process TV Groups
        for (tmdb_id, season), episodes in tv_groups.items():
            # Deduplicate and sort episodes
            episodes = sorted(list(set(episodes)))
            target_episode = episodes if len(episodes) > 1 else (episodes[0] if episodes else None)
            
            m_type = ItemType.EPISODE if target_episode is not None else ItemType.SEASON
            final_item_type = m_type

            match = db.query(MediaMatch).filter(
                MediaMatch.media_item_id == item.id,
                MediaMatch.tmdb_id == tmdb_id,
                MediaMatch.season_number == season
            ).first()

            if not match:
                match = MediaMatch(
                    media_item_id=item.id,
                    tmdb_id=tmdb_id,
                    item_type=m_type,
                    season_number=season,
                    episode_number=target_episode,
                    is_active=True,
                    confidence_score=1.0
                )
                db.add(match)
            else:
                match.is_active = True
                match.item_type = m_type
                match.episode_number = target_episode
                match.season_number = season
            
            active_match = match

        # Process Movie Targets
        for target in movie_targets:
            m_type = ItemType.MOVIE
            final_item_type = m_type

            match = db.query(MediaMatch).filter(
                MediaMatch.media_item_id == item.id,
                MediaMatch.tmdb_id == target.tmdb_id,
                MediaMatch.item_type == m_type
            ).first()

            if not match:
                match = MediaMatch(
                    media_item_id=item.id,
                    tmdb_id=target.tmdb_id,
                    item_type=m_type,
                    is_active=True,
                    confidence_score=1.0
                )
                db.add(match)
            else:
                match.is_active = True
            
            active_match = match

        # Update item status: matched ONLY if we have at least one high-specificity match
        # (Simplified logic: use the last target's type)
        if final_item_type in [ItemType.MOVIE, ItemType.EPISODE]:
            item.status = ItemStatus.MATCHED
        else:
            item.status = ItemStatus.UNCERTAIN

        item.item_type = final_item_type
        db.commit()
        
        # 3. Enrich
        from app.db.models import UserSetting
        lang = db.query(UserSetting).filter(UserSetting.key == "primary_metadata_language").first()
        fallback = db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
        
        enricher = MetadataEnricher(db)
        enricher.enrich_matched_item(
            item, 
            language=lang.value if lang else "en",
            fallback_language=fallback.value if fallback and fallback.value != "none" else None
        )
        
        # 4. Trigger image download
        import threading
        from app.scanner.image_worker import ImageWorker
        def run_image_worker():
            local_db = Session()
            try:
                iw = ImageWorker(local_db, "./data")
                iw.process_all()
            finally:
                local_db.close()
        threading.Thread(target=run_image_worker, daemon=True).start()
        
        return {"status": "success", "match_id": match.id}
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error resolving metadata: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.get("/item/{item_id}/full-metadata")
def get_full_metadata(item_id: int):
    db = Session()
    try:
        from app.db.models import MediaItem, TMDBCache, MediaMatch
        from sqlalchemy.orm import joinedload
        from fastapi.responses import JSONResponse
        
        item = db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations)
        ).filter(MediaItem.id == item_id).first()
        
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found"})
            
        tech = {
            "duration": item.duration,
            "size_mb": round(item.size / (1024 * 1024), 2) if item.size else 0,
            "resolution": item.resolution,
            "video_codec": item.video_codec,
            "video_bitrate": item.video_bitrate,
            "audio_codec": item.audio_codec,
            "audio_channels": item.audio_channels,
            "audio_bitrate": item.audio_bitrate,
            "bit_depth": item.bit_depth,
            "hdr_type": item.hdr_type,
            "framerate": item.framerate,
            "audio_streams": item.audio_streams or []
        }
        
        guessit = {
            "nfo_imdb_id": item.nfo_imdb_id,
            "internal_title": item.internal_title,
            "fn_title": item.fn_title,
            "fn_year": item.fn_year,
            "fn_season": item.fn_season,
            "fn_episode": item.fn_episode,
            "fn_item_type": item.fn_item_type,
            "fn_part": item.fn_part,
            "fd_title": item.fd_title,
            "fd_year": item.fd_year,
            "fd_season": item.fd_season,
            "fd_episode": item.fd_episode,
            "fd_item_type": item.fd_item_type,
            "fd_part": item.fd_part,
            "it_title": item.it_title,
            "it_year": item.it_year,
            "it_season": item.it_season,
            "it_episode": item.it_episode,
            "it_item_type": item.it_item_type
        }
        
        overrides = {
            "target_language": item.target_language,
            "source": item.source.value if item.source else None,
            "edition": item.edition.value if item.edition else None,
            "audio_type": item.audio_type.value if item.audio_type else None
        }
        
        matches_data = []
        for match in item.matches:
            tmdb_caches = db.query(TMDBCache).filter(
                TMDBCache.tmdb_id == match.tmdb_id
            ).all()
            
            api_responses = {}
            for cache in tmdb_caches:
                api_responses[cache.target_language] = cache.raw_data
                
            localizations = []
            for loc in match.localizations:
                localizations.append({
                    "language": loc.target_language,
                    "is_primary": loc.is_primary,
                    "title": loc.title,
                    "original_title": loc.original_title,
                    "series_title": loc.series_title,
                    "original_series_title": loc.original_series_title,
                    "season_title": loc.season_title,
                    "episode_title": loc.episode_title,
                    "tagline": loc.tagline,
                    "overview": loc.overview,
                    "genres": loc.genres,
                    "origin_country": loc.origin_country,
                    "original_language": loc.original_language,
                    "spoken_languages": loc.spoken_languages,
                    "poster_path": loc.poster_path,
                    "local_poster_path": loc.local_poster_path,
                    "series_poster_path": loc.series_poster_path,
                    "local_series_poster_path": loc.local_series_poster_path,
                    "backdrop_path": loc.backdrop_path,
                    "local_backdrop_path": loc.local_backdrop_path,
                    "still_path": loc.still_path,
                    "local_still_path": loc.local_still_path,
                    "all_stills": loc.all_stills,
                    "local_all_stills": loc.local_all_stills,
                    "local_thumb_path": loc.local_thumb_path
                })
                
            matches_data.append({
                "id": match.id,
                "tmdb_id": match.tmdb_id,
                "imdb_id": match.imdb_id,
                "series_tmdb_id": match.series_tmdb_id,
                "season_tmdb_id": match.season_tmdb_id,
                "type": match.item_type.value if match.item_type else "unknown",
                "is_active": match.is_active,
                "confidence": match.confidence_score,
                "season_number": match.season_number,
                "episode_number": match.episode_number,
                "episode_count": match.episode_count,
                "release_date": str(match.release_date) if match.release_date else None,
                "first_air_date": str(match.first_air_date) if match.first_air_date else None,
                "last_air_date": str(match.last_air_date) if match.last_air_date else None,
                "episode_air_date": str(match.episode_air_date) if match.episode_air_date else None,
                "season_air_date": str(match.season_air_date) if match.season_air_date else None,
                "runtime": match.runtime,
                "popularity": match.popularity,
                "release_status": match.release_status,
                "rating_tmdb": match.rating_tmdb,
                "rating_imdb": match.rating_imdb,
                "rating_rotten": match.rating_rotten,
                "rating_meta": match.rating_meta,
                "vote_count_tmdb": match.vote_count_tmdb,
                "vote_count_imdb": match.vote_count_imdb,
                "budget": match.budget,
                "revenue": match.revenue,
                "director": match.director,
                "cast": match.cast,
                "collection": match.collection,
                "networks": match.networks,
                "series_type": match.series_type,
                "number_of_seasons": match.number_of_seasons,
                "number_of_episodes": match.number_of_episodes,
                "fetched_languages": match.fetched_languages,
                "image_status": match.image_status.value if match.image_status else None,
                "backdrop_status": match.backdrop_status.value if match.backdrop_status else None,
                "localizations": localizations,
                "api_responses": api_responses
            })
            
        result = {
            "id": item.id,
            "filename": item.filename,
            "folder": item.folder_name,
            "technical": tech,
            "guessit": guessit,
            "overrides": overrides,
            "matches": matches_data
        }
        
        return JSONResponse(content=result, media_type="application/json; charset=utf-8")
    except Exception as e:
        import traceback
        import logging
        logging.error(f"Error getting full metadata: {e}")
        logging.error(traceback.format_exc())
        from fastapi.responses import JSONResponse
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        db.close()


