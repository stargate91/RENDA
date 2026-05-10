from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os

from app.db.base import Session, Base, engine
from app.db.models import * # Ensure all models are registered
from app.scanner.scanner_manager import ScannerManager, scan_status

# Automatically create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RENDA API")

# Mount media folder
app.mount("/media", StaticFiles(directory="data/media"), name="media")

# Enable CORS so Electron can talk to the Python server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    paths: List[str]

@app.get("/scan-status")
def get_scan_status():
    """Returns the current progress of the background scan."""
    return scan_status

@app.get("/settings")
def get_settings():
    db = Session()
    try:
        settings = db.query(UserSetting).all()
        return {s.key: s.value for s in settings}
    finally:
        db.close()

@app.post("/settings")
def update_settings(settings: dict):
    db = Session()
    try:
        for key, value in settings.items():
            setting = db.query(UserSetting).filter(UserSetting.key == key).first()
            if setting:
                setting.value = value
            else:
                setting = UserSetting(key=key, value=value)
                db.add(setting)
        db.commit()
        return {"status": "success"}
    finally:
        db.close()

@app.post("/database/clear")
def clear_database():
    """Wipes the entire database except for the user_settings table."""
    db = Session()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            if table.name != "user_settings":
                db.execute(table.delete())
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@app.get("/image-status")
def get_image_status():
    """Returns the current progress of background image and profile downloads."""
    db = Session()
    try:
        total_tasks = (db.query(MediaMatch).count() * 2) + (db.query(Person).count() * 2)
        if total_tasks == 0:
            return {"active": False, "pending": 0, "downloading": 0, "total": 0, "completed": 0}
            
        completed_tasks = (
            db.query(MediaMatch).filter(MediaMatch.image_status.in_([ImageStatus.COMPLETED, ImageStatus.FAILED])).count() +
            db.query(MediaMatch).filter(MediaMatch.backdrop_status.in_([ImageStatus.COMPLETED, ImageStatus.FAILED])).count() +
            db.query(Person).filter(Person.image_status.in_([ImageStatus.COMPLETED, ImageStatus.FAILED])).count() +
            db.query(Person).filter(Person.images != None).count()
        )
        
        active = total_tasks > completed_tasks
        
        return {
            "active": active,
            "pending": total_tasks - completed_tasks,
            "downloading": 0,
            "total": total_tasks,
            "completed": completed_tasks
        }
    finally:
        db.close()

@app.get("/stats")
def get_stats():
    """Returns library statistics for the dashboard."""
    db = Session()
    try:
        from sqlalchemy import func

        # Movies: renamed/organized with type MOVIE
        total_movies = db.query(func.count(MediaItem.id)).filter(
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            MediaItem.item_type == ItemType.MOVIE
        ).scalar() or 0

        # Series: count distinct series titles (renamed/organized, type EPISODE or SERIES)
        # Use fn_title or fd_title as the series identifier
        total_series = db.query(
            func.count(func.distinct(func.coalesce(MediaItem.fd_title, MediaItem.fn_title)))
        ).filter(
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE])
        ).scalar() or 0

        # Episodes: total episode count (renamed/organized)
        total_episodes = db.query(func.count(MediaItem.id)).filter(
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE])
        ).scalar() or 0

        # Storage: ALL media items (ExtraFile has no size column yet)
        total_bytes = db.query(func.coalesce(func.sum(MediaItem.size), 0)).scalar()

        # Format storage
        if total_bytes >= 1024 ** 4:
            storage_str = f"{total_bytes / (1024 ** 4):.1f} TB"
        elif total_bytes >= 1024 ** 3:
            storage_str = f"{total_bytes / (1024 ** 3):.1f} GB"
        else:
            storage_str = f"{total_bytes / (1024 ** 2):.0f} MB"

        # Unmatched: items pending in discovery
        unmatched = db.query(func.count(MediaItem.id)).filter(
            MediaItem.status.in_([
                ItemStatus.NEW, ItemStatus.MATCHED,
                ItemStatus.UNCERTAIN, ItemStatus.NO_MATCH,
                ItemStatus.MULTIPLE, ItemStatus.ERROR
            ])
        ).scalar() or 0

        return {
            "total_movies": total_movies,
            "total_series": total_series,
            "total_episodes": total_episodes,
            "storage": storage_str,
            "unmatched": unmatched
        }
    finally:
        db.close()

@app.get("/discovery")
def get_discovery_items():
    """Returns grouped discovery items for the UI."""
    db = Session()
    try:
        # Lekérjük az összes releváns médiaelemet a kapcsolódó adatokkal együtt
        from sqlalchemy.orm import joinedload
        items = db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations)
        ).filter(
            MediaItem.status.in_([
                ItemStatus.NEW, ItemStatus.MATCHED, 
                ItemStatus.UNCERTAIN, ItemStatus.NO_MATCH, 
                ItemStatus.MULTIPLE, ItemStatus.ERROR
            ])
        ).all()
        
        # Lekérjük az összes extrát is a szülő adataival együtt
        extras = db.query(
            ExtraFile, 
            MediaItem.status,
            MediaItem.planned_path, 
            MediaItem.filename
        ).join(
            MediaItem, ExtraFile.parent_item_id == MediaItem.id
        ).all()
        
        groups = {
            "manual": [],
            "movies": [],
            "series": [],
            "extras": [],
            "collisions": []
        }
        
        # Először számoljuk meg a hash-eket a collisionökhöz
        hash_counts = {}
        for item in items:
            if item.group_hash:
                hash_counts[item.group_hash] = hash_counts.get(item.group_hash, 0) + 1
        
        for item in items:
            # Összeszedjük az összes aktív találat összes képét
            all_images = []
            active_matches = [m for m in item.matches if m.is_active]
            
            for am in active_matches:
                loc = am.localizations[0] if am.localizations else None
                if loc:
                    # 1. Aktuális Epizód képe (Still)
                    if loc.still_path:
                        all_images.append({"type": "episode", "path": f"/media/images/stills{loc.still_path}"})
                    
                    # 2. További epizódképek (Galéria)
                    if loc.all_stills:
                        for s_path in loc.all_stills:
                            if s_path != loc.still_path: # Ne duplikáljuk az aktuálisat
                                all_images.append({"type": "episode", "path": f"/media/images/stills{s_path}"})

                    # 3. Szezon vagy Film poszter
                    if loc.poster_path:
                        img_type = "poster" if item.item_type.value == "movie" else "season"
                        all_images.append({"type": img_type, "path": f"/media/images/posters{loc.poster_path}"})
                    
                    # 4. Fő sorozat poszter (Csak ha eltér a szezontól)
                    if loc.series_poster_path and loc.series_poster_path != loc.poster_path:
                        all_images.append({"type": "series", "path": f"/media/images/posters{loc.series_poster_path}"})

            data = {
                "id": item.id,
                "filename": item.filename,
                "folder": item.folder_name,
                "status": item.status.value,
                "type": item.item_type.value if item.item_type else "unknown",
                "title": item.fn_title or item.fd_title or item.filename,
                "year": item.fn_year or item.fd_year,
                "planned_path": item.planned_path,
                "size_mb": round(item.size / (1024 * 1024), 2) if item.size else 0,
                "group_hash": item.group_hash,
                "images": all_images,
                "resolution": item.resolution,
                "duration": item.duration,
                "video_codec": item.video_codec,
                "audio_codec": item.audio_codec
            }
            
            # 1. Collision check (ha több elemnek ugyanaz a hash-e)
            if item.group_hash and hash_counts[item.group_hash] > 1:
                groups["collisions"].append(data)
                # A collisionök is belekerülhetnek a többi kategóriába is, 
                # de a fül segít megtalálni őket.
            
            # 2. Csoportosítási logika
            if item.status in [ItemStatus.NEW, ItemStatus.UNCERTAIN, ItemStatus.NO_MATCH, ItemStatus.MULTIPLE, ItemStatus.ERROR]:
                groups["manual"].append(data)
            else:
                # Matched
                if item.item_type == ItemType.MOVIE:
                    groups["movies"].append(data)
                elif item.item_type in [ItemType.SERIES, ItemType.EPISODE]:
                    groups["series"].append(data)
                else:
                    groups["movies"].append(data) # Fallback

        from ..formatter.formatter import Formatter
        formatter = Formatter()

        # PASS 1: Kiszámoljuk az összes tervezett útvonalat
        extra_paths = []
        path_counts = {}

        for ex, p_status, p_planned, p_filename in extras:
            # Ha matched, akkor a tervezett nevet használjuk, különben az eredetit
            raw_parent_name = p_planned if (p_status == ItemStatus.MATCHED and p_planned) else p_filename
            parent_name = os.path.splitext(raw_parent_name)[0]
            
            if p_status == ItemStatus.MATCHED and p_planned:
                parent_dir = os.path.dirname(p_planned)
            else:
                parent_dir = ""
                
            parent_name_no_ext = os.path.basename(parent_name)
            
            extra_ctx = formatter.build_extra_context(ex, parent_name_no_ext)
            extra_name = formatter.format_extra_filename(extra_ctx)
            extra_sub = formatter.get_extra_subpath(ex)
            
            import pathlib
            base_path = str(pathlib.Path(parent_dir) / extra_sub / extra_name).replace("\\", "/")
            raw_planned_path = base_path
            
            path_key = raw_planned_path.lower()
            path_counts[path_key] = path_counts.get(path_key, 0) + 1
                
            extra_paths.append((ex, raw_planned_path, parent_name))

        # PASS 2: Collision handling és JSON összeállítás
        current_counts = {}
        for ex, raw_planned_path, parent_name in extra_paths:
            planned_path = raw_planned_path
            
            if planned_path != "-":
                path_key = raw_planned_path.lower()
                if path_counts[path_key] > 1:
                    current_counts[path_key] = current_counts.get(path_key, 0) + 1
                    idx = current_counts[path_key]
                    
                    if ex.extension:
                        base = raw_planned_path[:-len(ex.extension)]
                        planned_path = f"{base} {idx}{ex.extension}"
                    else:
                        planned_path = f"{raw_planned_path} {idx}"
            
            groups["extras"].append({
                "id": ex.id,
                "parent_id": ex.parent_item_id,
                "parent_name": parent_name,
                "filename": os.path.basename(ex.original_path),
                "extension": ex.extension,
                "category": ex.category.value,
                "subtype": ex.subtype.value if ex.subtype else "other",
                "language": ex.language,
                "path": ex.original_path,
                "planned_path": planned_path
            })
            
        from fastapi.responses import JSONResponse
        import json
        
        # Kényszerítjük az UTF-8 kódolást a JSON válaszhoz
        return JSONResponse(content=groups, media_type="application/json; charset=utf-8")
    except Exception as e:
        import traceback
        logger.error(f"Error in get_discovery_items: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        db.close()

@app.get("/item/{item_id}/full-metadata")
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

@app.post("/scan")
def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    """Triggers a library scan in the background."""
    def run_scan():
        db = Session()
        try:
            scanner = ScannerManager(db)
            scanner.scan_and_save(request.paths)
        finally:
            db.close()
    
    background_tasks.add_task(run_scan)
    return {"message": "Scan started in background", "paths": request.paths}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
