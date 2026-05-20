from fastapi import APIRouter
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

from app.db.deletion import delete_extra_files_by_ids, delete_media_items_by_ids
from app.db.base import Session
from app.db.models import *

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recommendations")
def get_recommendations():
    from app.services.media_library_service import MediaLibraryService
    from app.api.tmdb_client import TMDBClient
    db = Session()
    try:
        # Get top genre
        stats = MediaLibraryService(db).get_stats()
        genres = stats.genre_distribution if hasattr(stats, "genre_distribution") else stats.get("genre_distribution", {})
        top_genre = None
        if genres:
            top_genre = sorted(genres.items(), key=lambda x: x[1], reverse=True)[0][0]

        # In a real app we'd map "Sci-Fi & Fantasy" to TMDB genre IDs (e.g. 878)
        # For simplicity, we just ask TMDB for discover without genres or try to map a few common ones
        genre_map = {
            "Action": "28", "Adventure": "12", "Animation": "16", "Comedy": "35",
            "Crime": "80", "Documentary": "99", "Drama": "18", "Family": "10751",
            "Fantasy": "14", "History": "36", "Horror": "27", "Music": "10402",
            "Mystery": "9648", "Romance": "10749", "Science Fiction": "878",
            "TV Movie": "10770", "Thriller": "53", "War": "10752", "Western": "37",
            "Sci-Fi & Fantasy": "878,14", "Action & Adventure": "28,12"
        }
        
        tmdb = TMDBClient(db)
        trending = tmdb.get_trending("all", "day")
        
        genre_id = genre_map.get(top_genre) if top_genre else None
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
    """Deletes specified media items and extras from the database."""
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
