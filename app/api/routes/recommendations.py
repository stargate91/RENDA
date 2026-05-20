from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import joinedload
from sqlalchemy import or_, func
import logging
import os
import threading
import subprocess
import platform
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta

from app.db.deletion import delete_extra_files_by_ids, delete_media_items_by_ids
from app.db.base import Session
from app.db.models import *

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recommendations")
def get_recommendations(background_tasks: BackgroundTasks):
    from app.services.media_library_service import MediaLibraryService
    from app.api.tmdb_client import TMDBClient
    from app.db.models.metadata import TMDBCache
    
    db = Session()
    try:
        # Get top genre
        stats = MediaLibraryService(db).get_stats()
        genres = stats.genre_distribution if hasattr(stats, "genre_distribution") else stats.get("genre_distribution", {})
        top_genre = None
        if genres:
            top_genre = sorted(genres.items(), key=lambda x: x[1], reverse=True)[0][0]

        genre_map = {
            "Action": "28", "Adventure": "12", "Animation": "16", "Comedy": "35",
            "Crime": "80", "Documentary": "99", "Drama": "18", "Family": "10751",
            "Fantasy": "14", "History": "36", "Horror": "27", "Music": "10402",
            "Mystery": "9648", "Romance": "10749", "Science Fiction": "878",
            "TV Movie": "10770", "Thriller": "53", "War": "10752", "Western": "37",
            "Sci-Fi & Fantasy": "878,14", "Action & Adventure": "28,12"
        }
        
        genre_id = genre_map.get(top_genre) if top_genre else None
        tmdb = TMDBClient(db)

        # Generate the exact cache keys used by get_trending and discover methods
        trending_key = tmdb._generate_cache_key("/trending/all/day", {
            "api_key": tmdb._api_key,
            "language": "en-US"
        })
        
        if genre_id:
            discover_endpoint = "/discover/movie"
            discover_params = {
                "api_key": tmdb._api_key,
                "language": "en-US",
                "page": 1,
                "sort_by": "popularity.desc",
                "with_genres": genre_id
            }
        else:
            discover_endpoint = "/trending/movie/week"
            discover_params = {
                "api_key": tmdb._api_key,
                "language": "en-US"
            }
        discover_key = tmdb._generate_cache_key(discover_endpoint, discover_params)

        # Retrieve cache items from DB (regardless of expiration)
        trending_cache = db.query(TMDBCache).filter(TMDBCache.cache_key == trending_key).first()
        discover_cache = db.query(TMDBCache).filter(TMDBCache.cache_key == discover_key).first()

        now = datetime.utcnow()
        needs_update = False
        
        # Check if cache is missing or older than 24 hours
        if not trending_cache or (now - trending_cache.updated_at > timedelta(hours=24)):
            needs_update = True
        if not discover_cache or (now - discover_cache.updated_at > timedelta(hours=24)):
            needs_update = True

        if needs_update:
            # Define background update function
            def update_recommendations_cache():
                bg_db = Session()
                try:
                    # Delete expired cache rows first to force fresh fetch in client
                    bg_db.query(TMDBCache).filter(TMDBCache.cache_key.in_([trending_key, discover_key])).delete()
                    bg_db.commit()
                    
                    bg_tmdb = TMDBClient(bg_db)
                    bg_tmdb.get_trending("all", "day")
                    if genre_id:
                        bg_tmdb.discover("movie", with_genres=genre_id)
                    else:
                        bg_tmdb.get_trending("movie", "week")
                except Exception as e:
                    logger.error(f"Error updating recommendations in background: {e}")
                finally:
                    bg_db.close()
            
            background_tasks.add_task(update_recommendations_cache)

        # If cache exists, return it immediately for instant page load
        if trending_cache and discover_cache:
            return {
                "trending": trending_cache.raw_data.get("results", []) if isinstance(trending_cache.raw_data, dict) else trending_cache.raw_data,
                "discover": discover_cache.raw_data.get("results", []) if isinstance(discover_cache.raw_data, dict) else discover_cache.raw_data,
                "top_genre": top_genre
            }

        # Otherwise (first run or one of the caches is missing), fetch synchronously
        trending = tmdb.get_trending("all", "day")
        discover = tmdb.discover("movie", with_genres=genre_id) if genre_id else tmdb.get_trending("movie", "week")
        return {
            "trending": trending,
            "discover": discover,
            "top_genre": top_genre
        }
    finally:
        db.close()

@router.get("/discovery")
def get_discovery_items():
    """Returns grouped discovery items for the UI."""
    from app.services.media_discovery_service import MediaDiscoveryService
    db = Session()
    try:
        groups = MediaDiscoveryService(db).get_discovery_groups()
        return groups.model_dump() if hasattr(groups, "model_dump") else groups.dict()
    finally:
        db.close()

@router.post("/discovery/delete")
def delete_discovery_items(payload: dict):
    item_ids = payload.get("item_ids", [])
    extra_ids = payload.get("extra_ids", [])
    db = Session()
    try:
        if item_ids:
            delete_media_items_by_ids(db, item_ids)
        if extra_ids:
            delete_extra_files_by_ids(db, extra_ids)
        db.commit()
        return {"status": "success", "deleted_items": len(item_ids), "deleted_extras": len(extra_ids)}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting items: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        db.close()

@router.post("/watchlist")
def add_to_watchlist(payload: dict):
    from app.api.tmdb_client import TMDBClient
    from app.db.models.media import CustomList, CustomListItem
    
    tmdb_id = payload.get("tmdb_id")
    item_type = payload.get("type", "movie")
    if not tmdb_id:
        return JSONResponse(status_code=400, content={"error": "tmdb_id is required"})

    db = Session()
    try:
        # 1. Ensure Watchlist exists
        watchlist = db.query(CustomList).filter(CustomList.name == "Watchlist").first()
        if not watchlist:
            watchlist = CustomList(
                name="Watchlist",
                description="Your default system watchlist.",
                color="#0088ff", # Neon Blue
                icon="Bookmark"
            )
            db.add(watchlist)
            db.commit()

        # 2. Check if item is already in Watchlist
        existing = db.query(CustomListItem).filter(
            CustomListItem.list_id == watchlist.id,
            CustomListItem.tmdb_id == tmdb_id
        ).first()
        if existing:
            return {"status": "success", "message": "Already in watchlist", "id": existing.id}

        # 3. Fetch details from TMDB to get the title and poster path
        tmdb = TMDBClient(db)
        details = tmdb.get_details(tmdb_id, item_type)
        if not details:
            return JSONResponse(status_code=404, content={"error": "TMDB details not found"})

        title = details.get("title") or details.get("name") or str(tmdb_id)
        poster_path = details.get("poster_path")

        # 4. Add CustomListItem
        new_item = CustomListItem(
            list_id=watchlist.id,
            tmdb_id=tmdb_id,
            media_type=item_type,
            title=title,
            poster_path=poster_path
        )
        db.add(new_item)
        db.commit()

        return {"status": "success", "id": new_item.id}
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error adding to custom watchlist: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()
