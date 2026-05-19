from fastapi import APIRouter
from app.db.base import Session
from app.db.models import *

router = APIRouter()

from sqlalchemy import func
from sqlalchemy.orm import joinedload
from fastapi.responses import JSONResponse, FileResponse
import os
import logging
import platform
import subprocess
import threading
from pathlib import Path
logger = logging.getLogger(__name__)


# ─── Trailer Endpoints ───────────────────────────────────────────────
@router.get("/trailer/{trailer_key}")
def get_trailer(trailer_key: str):
    """
    Stream a locally cached trailer. If not yet downloaded, returns 202 with status.
    If ready, returns the video file for direct <video> playback.
    """
    from app.services.trailer_service import get_trailer_path, is_downloading

    path = get_trailer_path(trailer_key)
    if path:
        return FileResponse(
            path=str(path),
            media_type="video/mp4",
            filename=f"{trailer_key}.mp4"
        )
    
    if is_downloading(trailer_key):
        return JSONResponse(
            status_code=202,
            content={"status": "downloading", "message": "Trailer is being downloaded..."}
        )
    
    return JSONResponse(
        status_code=404,
        content={"status": "not_found", "message": "Trailer not cached. Call POST /api/trailer/{key} to start download."}
    )


@router.get("/trailer/{trailer_key}/status")
def check_trailer_status(trailer_key: str):
    """
    Lightweight status check for a trailer to see if it is cached, downloading, or not found.
    Used by the frontend polling mechanism to avoid downloading the video file.
    """
    from app.services.trailer_service import get_trailer_path, is_downloading
    
    path = get_trailer_path(trailer_key)
    if path:
        return {"status": "ready"}
    if is_downloading(trailer_key):
        return {"status": "downloading"}
    return {"status": "not_found"}


@router.post("/trailer/{trailer_key}")
def request_trailer_download(trailer_key: str):
    """
    Trigger an on-demand trailer download via yt-dlp.
    Returns immediately; the download happens in a background thread.
    """
    from app.services.trailer_service import get_trailer_path, download_trailer, is_downloading

    # Already downloaded?
    path = get_trailer_path(trailer_key)
    if path:
        return {"status": "ready", "url": f"/api/trailer/{trailer_key}"}
    
    # Already downloading?
    if is_downloading(trailer_key):
        return JSONResponse(
            status_code=202,
            content={"status": "downloading", "message": "Download already in progress."}
        )
    
    # Start background download
    def _bg_download():
        download_trailer(trailer_key)
    
    thread = threading.Thread(target=_bg_download, daemon=True)
    thread.start()
    
    return JSONResponse(
        status_code=202,
        content={"status": "downloading", "message": "Trailer download started."}
    )

@router.get("/stats")
def get_stats():
    """Returns library statistics for the dashboard."""
    from app.services.media_library_service import MediaLibraryService
    db = Session()
    try:
        stats = MediaLibraryService(db).get_stats()
        # Ensure it returns a dictionary compatible with the frontend
        return stats.model_dump() if hasattr(stats, "model_dump") else stats.dict()
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
            db.query(MediaItem).filter(MediaItem.id.in_(item_ids)).delete(synchronize_session=False)
        if extra_ids:
            db.query(ExtraFile).filter(ExtraFile.id.in_(extra_ids)).delete(synchronize_session=False)
        db.commit()
        return {"status": "success", "deleted_items": len(item_ids), "deleted_extras": len(extra_ids)}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting items: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        db.close()


@router.post("/media/update")
def update_media_item(payload: dict):
    """Updates media item or extra file properties manually."""
    db = Session()
    try:
        from app.db.models import MediaItem, ExtraFile, MediaMatch, ItemType
        from app.formatter.formatter import Formatter
        
        item_id = payload.get("id")
        item_type = payload.get("type", "media")
        updates = payload.get("updates", {})
        
        if item_type == "media":
            item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
            if not item:
                return JSONResponse(status_code=404, content={"error": "Media item not found"})
            
            # Basic overrides
            try:
                if "target_language" in updates: item.target_language = updates["target_language"]
                if "edition" in updates: item.edition = MovieEdition(updates["edition"])
                if "source" in updates: item.source = MediaSource(updates["source"])
                if "audio_type" in updates: item.audio_type = MediaAudioType(updates["audio_type"])
                if "item_type" in updates: item.item_type = ItemType(updates["item_type"])
                
                # Part management
                if "part" in updates: item.part = int(updates["part"]) if updates["part"] else None
                if "part_type" in updates: item.part_type = PartType(updates["part_type"])
                if "part_style" in updates: item.part_style = PartStyle(updates["part_style"])
            except ValueError as ve:
                return JSONResponse(status_code=400, content={"error": f"Invalid value for field: {ve}"})

            # Season/Episode management
            if "season" in updates or "episode" in updates:
                active_match = next((m for m in item.matches if m.is_active), None)
                if active_match:
                    if "season" in updates: active_match.season_number = int(updates["season"]) if updates["season"] else None
                    if "episode" in updates: active_match.episode_number = updates["episode"] # Keep as JSON/Any
                    active_match.item_type = ItemType.EPISODE
                    item.item_type = ItemType.EPISODE
        else:
            extra = db.query(ExtraFile).filter(ExtraFile.id == item_id).first()
            if not extra:
                return JSONResponse(status_code=404, content={"error": "Extra file not found"})
            
            try:
                if "subtype" in updates: extra.subtype = ExtraSubtype(updates["subtype"])
                if "language" in updates: extra.language = updates["language"]
                if "parent_id" in updates: extra.parent_item_id = int(updates["parent_id"]) if updates["parent_id"] else extra.parent_item_id
            except ValueError as ve:
                return JSONResponse(status_code=400, content={"error": f"Invalid value for field: {ve}"})
            
            item = extra.parent_item

        formatter = Formatter.from_db(db)
        active_match = next((m for m in item.matches if m.is_active), None)
        if active_match:
            from app.scanner.metadata_enricher import MetadataEnricher
            enricher = MetadataEnricher(db)
            preview = formatter.plan_rename(active_match, "")
            
            # Safe path joining
            if preview.target_subpath:
                item.planned_path = str(Path(preview.target_subpath) / preview.target_name).replace("\\", "/")
            else:
                item.planned_path = preview.target_name
            
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error updating media: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.get("/library")
def get_library_items():
    """Returns grouped organized items for the Library view."""
    from app.services.media_library_service import MediaLibraryService
    db = Session()
    try:
        library = MediaLibraryService(db).get_grouped_library()
        return library.model_dump() if hasattr(library, "model_dump") else (library.dict() if hasattr(library, "dict") else library)
    finally:
        db.close()

@router.post("/reveal")
def reveal_in_explorer(payload: dict):
    """Opens the file's parent folder and selects the file in the OS file explorer."""
    path = payload.get("path")
    if not path or not os.path.exists(path):
        return {"status": "error", "message": f"Path does not exist: {path}"}
    
    path = os.path.abspath(path)
    try:
        if platform.system() == "Windows":
            # /select highlights the file and usually brings explorer to front
            subprocess.Popen(f'explorer /select,"{os.path.normpath(path)}"')
        elif platform.system() == "Darwin":
            # -R reveals the file in Finder
            subprocess.run(["open", "-R", path])
        else:
            # For Linux, we still just open the folder as xdg-open doesn't have a universal select
            folder = os.path.dirname(path)
            subprocess.run(["xdg-open", folder])
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Reveal failed: {e}")
        return {"status": "error", "message": str(e)}


def find_media_player():
    """
    Looks for VLC or MPC-HC in standard paths on Windows.
    Returns (player_path, player_type) or (None, None).
    """
    if platform.system() != "Windows":
        return None, None
        
    vlc_paths = [
        r"C:\Program Files\VideoLAN\VLC\vlc.exe",
        r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe"
    ]
    for p in vlc_paths:
        if os.path.exists(p):
            return p, "vlc"
            
    mpc_paths = [
        r"C:\Program Files\MPC-HC\mpc-hc64.exe",
        r"C:\Program Files (x86)\MPC-HC\mpc-hc.exe"
    ]
    for p in mpc_paths:
        if os.path.exists(p):
            return p, "mpc"
            
    return None, None


def monitor_playback(item_id: int, player_type: str, proc: subprocess.Popen, port: int):
    """
    Background worker thread to monitor external media player.
    Saves last watched date, play count, resume position, and marks watched.
    """
    import time
    import requests
    import re
    from app.db.base import Session
    from app.db.models import MediaItem
    
    logger.info(f"Started playback monitoring thread for item_id={item_id}, player={player_type}, port={port}")
    
    last_saved_time = 0
    total_length = 0
    current_time = 0
    
    # Wait a moment for the player to initialize
    time.sleep(3)
    
    try:
        while proc.poll() is None:
            time.sleep(2)
            try:
                if player_type == "vlc":
                    r = requests.get(
                        f"http://localhost:{port}/requests/status.json", 
                        auth=("", "renda"), 
                        timeout=1.5
                    )
                    if r.status_code == 200:
                        data = r.json()
                        current_time = int(data.get("time", 0))
                        total_length = int(data.get("length", 0))
                elif player_type == "mpc":
                    r = requests.get(
                        f"http://localhost:{port}/variables.html", 
                        timeout=1.5
                    )
                    if r.status_code == 200:
                        pos_match = re.search(r'id="position">(\d+)</p>', r.text)
                        dur_match = re.search(r'id="duration">(\d+)</p>', r.text)
                        if pos_match:
                            current_time = int(pos_match.group(1)) // 1000
                        if dur_match:
                            total_length = int(dur_match.group(1)) // 1000
                
                # If position changed and is significantly different, update db periodically
                if current_time > 0 and abs(current_time - last_saved_time) >= 10:
                    last_saved_time = current_time
                    db = Session()
                    try:
                        item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
                        if item:
                            item.resume_position = current_time
                            
                            # If watched over 90% of the video, mark as watched/completed and reset resume
                            if total_length > 0:
                                progress = current_time / total_length
                                if progress > 0.90:
                                    item.is_watched = True
                                    item.resume_position = 0
                            
                            db.commit()
                    except Exception as ex:
                        db.rollback()
                        logger.error(f"Failed to update playback position in thread: {ex}")
                    finally:
                        db.close()
                        
            except Exception as e:
                # Debug logging only to avoid visual clutter
                logger.debug(f"Playback polling request failed: {e}")
                
    except Exception as e:
        logger.error(f"Error in playback monitoring thread: {e}")
    finally:
        logger.info(f"Playback monitoring thread finished for item_id={item_id}")


@router.post("/media/play")
def play_media_item(payload: dict):
    """Launches the media file locally using the OS default associated media player."""
    item_id = payload.get("item_id")
    if not item_id:
        return JSONResponse(status_code=400, content={"error": "item_id is required"})
        
    db = Session()
    try:
        from app.db.models import MediaItem, PlaybackLog
        from datetime import datetime
        import os
        import platform
        import subprocess
        import threading
        
        item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Media item not found"})
            
        file_path = item.current_path
        if not file_path or not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"Media file not found at: {file_path}"})
            
        logger.info(f"Launching media file with hybrid tracking: {file_path}")
        
        # 1. Update general stats immediately
        item.watch_count += 1
        item.last_watched_at = datetime.utcnow()
        
        # Create a new PlaybackLog entry
        log_entry = PlaybackLog(media_item_id=item.id, watched_at=datetime.utcnow())
        db.add(log_entry)
        db.commit()
        
        start_seconds = item.resume_position or 0
        
        # 2. Try to find VLC or MPC-HC for precision tracking
        player_path, player_type = find_media_player()
        
        if player_path and player_type:
            proc = None
            port = 8080 if player_type == "vlc" else 13579
            
            if player_type == "vlc":
                args = [player_path, os.path.normpath(file_path)]
                if start_seconds > 10:
                    args.append(f"--start-time={start_seconds}")
                args.extend(["--extraintf=http", "--http-password=renda", f"--http-port={port}"])
                proc = subprocess.Popen(args)
            elif player_type == "mpc":
                args = [player_path, os.path.normpath(file_path)]
                if start_seconds > 10:
                    h = start_seconds // 3600
                    m = (start_seconds % 3600) // 60
                    s = start_seconds % 60
                    args.extend(["/startpos", f"{h:02d}:{m:02d}:{s:02d}"])
                proc = subprocess.Popen(args)
                
            if proc:
                # Launch background daemon thread to poll playback progress
                t = threading.Thread(
                    target=monitor_playback, 
                    args=(item.id, player_type, proc, port),
                    daemon=True
                )
                t.start()
                return {
                    "status": "success", 
                    "message": f"Launched {player_type.upper()} with precision hybrid tracking for {file_path}"
                }
                
        # 3. Fallback to default OS launch if VLC/MPC not installed or failed to launch
        logger.info(f"VLC or MPC-HC not found. Falling back to default OS player for: {file_path}")
        if platform.system() == "Windows":
            os.startfile(os.path.normpath(file_path))
        elif platform.system() == "Darwin": # macOS
            subprocess.run(["open", file_path])
        else: # Linux
            subprocess.run(["xdg-open", file_path])
            
        return {"status": "success", "message": f"Launched default player (no position tracking) for {file_path}"}
        
    except Exception as e:
        logger.error(f"Failed to play media file: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


def _ensure_person_cached(db, actor_id: int, actor_name: str, actor_profile_path: Optional[str], actor_popularity: Optional[float], ui_lang: str) -> Optional[str]:
    """
    Checks if a person exists in the database. If not, creates them with ImageStatus.PENDING so they get cached by the ImageWorker.
    Returns the local profile path if already downloaded, or the TMDB URL if pending.
    """
    from app.db.models import Person, PersonLocalization, ImageStatus
    from typing import Optional
    import os

    if not actor_profile_path:
        return None

    # Check if person already exists
    person = db.query(Person).filter(Person.id == actor_id).first()
    if not person:
        try:
            # Create Person
            person = Person(
                id=actor_id,
                popularity=actor_popularity,
                profile_path=actor_profile_path,
                image_status=ImageStatus.PENDING,
                is_active=False
            )
            db.add(person)
            
            # Create Localization
            lang_code = ui_lang.split("-")[0] if ui_lang else "en"
            loc = PersonLocalization(
                person_id=actor_id,
                language=lang_code,
                name=actor_name
            )
            db.add(loc)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating virtual Person: {e}")
            person = db.query(Person).filter(Person.id == actor_id).first()
    else:
        # If person exists but has no profile path or image status is none, update it
        updated = False
        if not person.profile_path and actor_profile_path:
            person.profile_path = actor_profile_path
            person.image_status = ImageStatus.PENDING
            updated = True
        elif person.image_status == ImageStatus.FAILED and actor_profile_path:
            person.image_status = ImageStatus.PENDING
            updated = True
        
        if updated:
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error updating Person profile: {e}")

    # Check if local image is available
    if person and person.local_profile_path:
        # Check if file actually exists on disk
        local_file_path = os.path.join("data", "media", "images", "persons", actor_profile_path.lstrip("/"))
        if os.path.exists(local_file_path):
            return actor_profile_path # Return relative path (e.g. /qA2...jpg)
            
    # Otherwise, return full TMDB URL
    return f"https://image.tmdb.org/t/p/h632{actor_profile_path}"


@router.get("/library/item/{item_id}")
def get_library_item_detail(item_id: str):
    """Returns comprehensive detail data for a single library item (movie detail page)."""
    db = Session()
    try:
        from app.db.models import MediaItem, MediaMatch, UserSetting, Person, MediaPersonLink, PersonLocalization, TMDBCache

        # Check if item_id is virtual (starts with tmdb_)
        if isinstance(item_id, str) and item_id.startswith("tmdb_"):
            try:
                tmdb_id = int(item_id.split("_")[1])
            except (ValueError, IndexError):
                return JSONResponse(status_code=400, content={"error": "Invalid TMDB ID format"})
                
            from app.api.tmdb_client import TMDBClient
            tmdb_client = TMDBClient(db)
            
            ui_lang_setting = db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
            ui_lang = ui_lang_setting.value if ui_lang_setting and ui_lang_setting.value != "none" else "en"
            
            tmdb_data = tmdb_client.get_details(tmdb_id, "movie", language=ui_lang)
            if not tmdb_data:
                return JSONResponse(status_code=404, content={"error": "Movie not found on TMDB"})
                
            credits = tmdb_data.get("credits", {})
            cast = []
            directors = []
            raw_directors = [c for c in credits.get("crew", []) if c.get("job") in ("Director", "Creator")][:2]
            for crew in raw_directors:
                profile_path = _ensure_person_cached(
                    db,
                    crew.get("id"),
                    crew.get("name"),
                    crew.get("profile_path"),
                    crew.get("popularity", 0),
                    ui_lang
                )
                directors.append({
                    "id": crew.get("id"),
                    "name": crew.get("name"),
                    "job": crew.get("job"),
                    "profile_path": profile_path,
                    "popularity": crew.get("popularity", 0)
                })
            
            director_ids = {d["id"] for d in directors}
            raw_cast = [a for a in credits.get("cast", []) if a.get("id") not in director_ids][:10]
            for actor in raw_cast:
                profile_path = _ensure_person_cached(
                    db,
                    actor.get("id"),
                    actor.get("name"),
                    actor.get("profile_path"),
                    actor.get("popularity", 0),
                    ui_lang
                )
                cast.append({
                    "id": actor.get("id"),
                    "name": actor.get("name"),
                    "character": actor.get("character"),
                    "job": "Actor",
                    "profile_path": profile_path,
                    "popularity": actor.get("popularity", 0)
                })

            videos = tmdb_data.get("videos", {}).get("results", [])
            trailer_key = None
            for v in videos:
                if v.get("site") == "YouTube" and v.get("type") in ("Trailer", "Teaser"):
                    trailer_key = v.get("key")
                    break

            release_date = tmdb_data.get("release_date")
            year = None
            if release_date:
                try:
                    year = int(release_date.split("-")[0])
                except:
                    pass

            result = {
                "id": f"tmdb_{tmdb_id}",
                "title": tmdb_data.get("title") or tmdb_data.get("original_title") or "Unknown",
                "original_title": tmdb_data.get("original_title"),
                "tagline": tmdb_data.get("tagline"),
                "overview": tmdb_data.get("overview"),
                "genres": [g["name"] for g in tmdb_data.get("genres", [])],
                "year": year,
                "release_date": release_date,
                "runtime": tmdb_data.get("runtime"),
                "rating_tmdb": tmdb_data.get("vote_average"),
                "vote_count_tmdb": tmdb_data.get("vote_count"),
                "budget": tmdb_data.get("budget"),
                "revenue": tmdb_data.get("revenue"),
                "poster_path": tmdb_data.get("poster_path"),
                "backdrop_path": tmdb_data.get("backdrop_path"),
                "original_language": tmdb_data.get("original_language"),
                "type": "movie",
                "tmdb_id": tmdb_id,
                "imdb_id": tmdb_data.get("external_ids", {}).get("imdb_id"),
                "cast": cast,
                "directors": directors,
                "is_adult": tmdb_data.get("adult", False),
                "is_favorite": False,
                "user_rating": None,
                "custom_tags": [],
                "tags": [],
                "watch_count": 0,
                "is_watched": False,
                "resume_position": 0,
                "trailer_key": trailer_key,
                "in_library": False,
            }
            return JSONResponse(content=result, media_type="application/json; charset=utf-8")

        # Original logic for local item
        try:
            item_id_int = int(item_id)
        except ValueError:
            return JSONResponse(status_code=400, content={"error": "Invalid item ID"})

        item = db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations),
            joinedload(MediaItem.matches).joinedload(MediaMatch.people).joinedload(MediaPersonLink.person).joinedload(Person.localizations)
        ).filter(MediaItem.id == item_id_int).first()
        
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found"})

        # Determine UI language
        ui_lang_setting = db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
        ui_lang = ui_lang_setting.value if ui_lang_setting and ui_lang_setting.value != "none" else None

        active_match = next((m for m in item.matches if m.is_active), None)
        if not active_match:
            return JSONResponse(status_code=404, content={"error": "No active match found"})

        # Get the best localization
        loc = None
        if active_match.localizations:
            if ui_lang:
                loc = next((l for l in active_match.localizations if l.target_language == ui_lang), None)
            if not loc:
                loc = next((l for l in active_match.localizations if l.is_primary), active_match.localizations[0])

        # Build cast list with person images
        cast = []
        directors = []
        for link in sorted(active_match.people, key=lambda x: x.order):
            person = link.person
            p_loc = None
            if person.localizations:
                if ui_lang:
                    p_loc = next((l for l in person.localizations if l.language == ui_lang), None)
                if not p_loc:
                    p_loc = person.localizations[0] if person.localizations else None

            person_data = {
                "id": person.id,
                "name": p_loc.name if p_loc else "Unknown",
                "character": link.character_name,
                "job": link.job,
                "profile_path": person.profile_path,
                "popularity": person.popularity or 0
            }

            if link.job in ("Director", "Creator"):
                directors.append(person_data)
            elif link.job == "Actor":
                cast.append(person_data)

        # Technical info
        technical = {
            "resolution": item.resolution,
            "video_codec": item.video_codec,
            "audio_codec": item.audio_codec,
            "audio_channels": item.audio_channels,
            "hdr_type": item.hdr_type,
            "bit_depth": item.bit_depth,
            "framerate": item.framerate,
            "duration": item.duration,
            "size_bytes": item.size,
            "source": item.source.value if item.source else None,
            "edition": item.edition.value if item.edition else None,
        }
        
        # Extract Trailer Key from Localization
        trailer_key = loc.trailer_url if loc else None

        result = {
            "id": item.id,
            "title": loc.title if loc else item.fn_title or item.filename,
            "original_title": loc.original_title if loc else None,
            "tagline": loc.tagline if loc else None,
            "overview": loc.overview if loc else None,
            "genres": loc.genres if loc else [],
            "year": active_match.release_date.year if active_match.release_date else (active_match.first_air_date.year if active_match.first_air_date else None),
            "release_date": str(active_match.release_date.date()) if active_match.release_date else None,
            "runtime": active_match.runtime,
            "rating_tmdb": active_match.rating_tmdb,
            "rating_imdb": active_match.rating_imdb,
            "rating_rotten": active_match.rating_rotten,
            "rating_meta": active_match.rating_meta,
            "vote_count_tmdb": active_match.vote_count_tmdb,
            "vote_count_imdb": active_match.vote_count_imdb,
            "budget": active_match.budget,
            "revenue": active_match.revenue,
            "collection": active_match.collection,
            "poster_path": loc.poster_path if loc else None,
            "backdrop_path": loc.backdrop_path if loc else None,
            "origin_country": loc.origin_country if loc else None,
            "original_language": loc.original_language if loc else None,
            "spoken_languages": loc.spoken_languages if loc else None,
            "type": item.item_type.value,
            "path": item.current_path,
            "filename": item.filename,
            "tmdb_id": active_match.tmdb_id,
            "imdb_id": active_match.imdb_id,
            "cast": cast[:10],  # Top 10 cast members
            "directors": directors[:2],
            "technical": technical,
            "is_adult": active_match.is_adult,
            "is_favorite": item.is_favorite or False,
            "user_rating": item.user_rating,
            "custom_tags": [t.name for t in item.tags] if item.tags else [],
            "tags": [{"id": t.id, "name": t.name, "color": t.color} for t in item.tags],
            "watch_count": getattr(item, "watch_count", 0),
            "is_watched": getattr(item, "is_watched", False),
            "resume_position": getattr(item, "resume_position", 0),
            "last_watched_at": getattr(item, "last_watched_at").isoformat() if getattr(item, "last_watched_at", None) else None,
            "trailer_key": trailer_key,
        }

        return JSONResponse(content=result, media_type="application/json; charset=utf-8")
    except Exception as e:
        import traceback
        logger.error(f"Error getting library item detail: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        db.close()

@router.post("/library/item/{item_id}/reset-progress")
def reset_item_progress(item_id: int):
    """Manually resets the playback progress of an item to 0 and removes the watched flag."""
    db = Session()
    try:
        from app.db.models import MediaItem
        item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found"})
        
        item.resume_position = 0
        item.is_watched = False
        # Do not modify last_watched_at so it remains in history, but we could if needed.
        
        db.commit()
        return {"status": "success", "resume_position": 0, "is_watched": False}
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error resetting progress: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


@router.get("/library/series/{series_tmdb_id}")
def get_library_series_detail(series_tmdb_id: str):
    """Returns comprehensive detail data for a full series, including seasons and episodes."""
    db = Session()
    try:
        from app.db.models import MediaItem, MediaMatch, UserSetting, Person, MediaPersonLink, ItemStatus, ItemType, TMDBCache
        from sqlalchemy import or_, and_
        
        # Parse virtual/real tmdb_id
        if isinstance(series_tmdb_id, str) and series_tmdb_id.startswith("tmdb_"):
            try:
                series_tmdb_id_int = int(series_tmdb_id.split("_")[1])
            except (ValueError, IndexError):
                return JSONResponse(status_code=400, content={"error": "Invalid series TMDB ID"})
        else:
            try:
                series_tmdb_id_int = int(series_tmdb_id)
            except ValueError:
                return JSONResponse(status_code=400, content={"error": "Invalid series TMDB ID"})
                
        # Try to fetch full series metadata from cache
        tmdb_cache = db.query(TMDBCache).filter(
            TMDBCache.tmdb_id == series_tmdb_id_int,
            TMDBCache.cache_key.like(f"/tv/{series_tmdb_id_int}%")
        ).first()
        cached_series = tmdb_cache.raw_data if tmdb_cache else {}
        cached_seasons = {s.get("season_number"): s for s in cached_series.get("seasons", [])}
        
        # Find all episodes for this series
        items = db.query(MediaItem).join(MediaItem.matches).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations),
            joinedload(MediaItem.matches).joinedload(MediaMatch.people).joinedload(MediaPersonLink.person)
        ).filter(
            or_(
                MediaMatch.series_tmdb_id == series_tmdb_id_int,
                MediaMatch.tmdb_id == series_tmdb_id_int
            ),
            MediaMatch.is_active == True,
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
        ).all()

        if not items:
            # Series is not in library, try to query TMDB directly
            from app.api.tmdb_client import TMDBClient
            tmdb_client = TMDBClient(db)
            ui_lang_setting = db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
            ui_lang = ui_lang_setting.value if ui_lang_setting and ui_lang_setting.value != "none" else "en"
            
            tmdb_data = tmdb_client.get_details(series_tmdb_id_int, "series", language=ui_lang)
            if not tmdb_data:
                return JSONResponse(status_code=404, content={"error": "Series not found on TMDB"})
                
            credits = tmdb_data.get("credits", {})
            cast = []
            directors = []
            raw_directors = [c for c in credits.get("crew", []) if c.get("job") in ("Director", "Creator", "Executive Producer")][:2]
            for crew in raw_directors:
                profile_path = _ensure_person_cached(
                    db,
                    crew.get("id"),
                    crew.get("name"),
                    crew.get("profile_path"),
                    crew.get("popularity", 0),
                    ui_lang
                )
                directors.append({
                    "id": crew.get("id"),
                    "name": crew.get("name"),
                    "job": crew.get("job"),
                    "profile_path": profile_path,
                    "popularity": crew.get("popularity", 0)
                })
                
            director_ids = {d["id"] for d in directors}
            raw_cast = [a for a in credits.get("cast", []) if a.get("id") not in director_ids][:10]
            for actor in raw_cast:
                profile_path = _ensure_person_cached(
                    db,
                    actor.get("id"),
                    actor.get("name"),
                    actor.get("profile_path"),
                    actor.get("popularity", 0),
                    ui_lang
                )
                cast.append({
                    "id": actor.get("id"),
                    "name": actor.get("name"),
                    "character": actor.get("character"),
                    "job": "Actor",
                    "profile_path": profile_path,
                    "popularity": actor.get("popularity", 0)
                })

            videos = tmdb_data.get("videos", {}).get("results", [])
            trailer_key = None
            for v in videos:
                if v.get("site") == "YouTube" and v.get("type") in ("Trailer", "Teaser"):
                    trailer_key = v.get("key")
                    break

            first_air_date = tmdb_data.get("first_air_date")
            year = None
            if first_air_date:
                try:
                    year = int(first_air_date.split("-")[0])
                except:
                    pass

            seasons_list = []
            for s in sorted(tmdb_data.get("seasons", []), key=lambda x: x.get("season_number") or 0):
                s_num = s.get("season_number")
                if s_num is None:
                    continue
                
                # Fetch season detail to get episodes
                try:
                    season_detail = tmdb_client.get_season_details(series_tmdb_id_int, s_num, language=ui_lang)
                except Exception:
                    season_detail = {}
                    
                episodes_list = []
                for ep in season_detail.get("episodes", []):
                    episodes_list.append({
                        "id": f"tmdb_{series_tmdb_id_int}_{s_num}_{ep.get('episode_number')}",
                        "episode_number": ep.get("episode_number"),
                        "title": ep.get("name") or f"Episode {ep.get('episode_number')}",
                        "overview": ep.get("overview"),
                        "still_path": ep.get("still_path"),
                        "runtime": ep.get("runtime"),
                        "rating_tmdb": ep.get("vote_average"),
                        "vote_count_tmdb": ep.get("vote_count"),
                        "path": None,
                        "filename": None,
                        "technical": {},
                        "watch_count": 0,
                        "is_watched": False,
                        "resume_position": 0,
                        "last_watched_at": None,
                        "in_library": False
                    })

                seasons_list.append({
                    "season_number": s_num,
                    "title": s.get("name") or f"Season {s_num}",
                    "overview": s.get("overview"),
                    "poster_path": s.get("poster_path"),
                    "air_date": s.get("air_date"),
                    "episodes": episodes_list
                })

            result = {
                "id": f"tmdb_{series_tmdb_id_int}",
                "series_tmdb_id": series_tmdb_id_int,
                "title": tmdb_data.get("name") or tmdb_data.get("original_name") or "Unknown Series",
                "backdrop_path": tmdb_data.get("backdrop_path"),
                "poster_path": tmdb_data.get("poster_path"),
                "year": year,
                "overview": tmdb_data.get("overview"),
                "rating_tmdb": tmdb_data.get("vote_average"),
                "genres": [g["name"] for g in tmdb_data.get("genres", [])],
                "cast": cast,
                "directors": directors,
                "seasons": seasons_list,
                "is_favorite": False,
                "user_rating": None,
                "custom_tags": [],
                "trailer_key": trailer_key,
                "path": None,
                "in_library": False
            }
            return JSONResponse(content=result, media_type="application/json; charset=utf-8")

        # Determine UI language
        ui_lang_setting = db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
        ui_lang = ui_lang_setting.value if ui_lang_setting and ui_lang_setting.value != "none" else None

        def get_sort_keys(item):
            match = next((m for m in item.matches if m.is_active), None)
            if not match: return (99, 99)
            
            s_num = match.season_number if match.season_number is not None else item.fn_season
            e_num = match.episode_number if match.episode_number is not None else item.fn_episode

            if s_num is None: s_num = 99
            if isinstance(e_num, list) and len(e_num) > 0:
                e_num = e_num[0]
            if e_num is None: e_num = 99
            try:
                s_num = int(s_num)
                e_num = int(e_num)
            except:
                e_num = 99
            return (s_num, e_num)

        # Filter out the series folder itself from the list of things we will map as episodes later
        episodes_only = [i for i in items if i.item_type == ItemType.EPISODE]
        episodes_only.sort(key=get_sort_keys)
        
        if not episodes_only:
            # Maybe they are not marked as EPISODE? fallback to items
            episodes_only = items
            episodes_only.sort(key=get_sort_keys)

        base_item = next((i for i in items if i.item_type == ItemType.SERIES), items[0]) # Try to use the series folder for global metadata
        base_match = next((m for m in base_item.matches if m.is_active), None)
        base_loc = None
        if base_match and base_match.localizations:
            if ui_lang:
                base_loc = next((l for l in base_match.localizations if l.target_language == ui_lang), None)
            if not base_loc:
                base_loc = next((l for l in base_match.localizations if l.is_primary), base_match.localizations[0])

        series_data = {
            "id": base_item.id,
            "series_tmdb_id": series_tmdb_id,
            "title": base_loc.series_title if base_loc else (base_loc.title if base_loc else "Unknown Series"),
            "backdrop_path": base_loc.backdrop_path if base_loc else None,
            "poster_path": base_loc.series_poster_path if base_loc and base_loc.series_poster_path else (base_loc.poster_path if base_loc else None),
            "year": base_item.fn_year,
            "overview": cached_series.get("overview") or (base_loc.overview if base_loc else None),
            "rating_tmdb": cached_series.get("vote_average") or (base_match.rating_tmdb if base_match else None),
            "rating_imdb": base_match.rating_imdb if base_match else None,
            "genres": [g["name"] for g in cached_series.get("genres", [])] if cached_series.get("genres") else (base_loc.genres if base_loc else []),
            "cast": [],
            "directors": [],
            "seasons": {},
            "is_favorite": base_item.is_favorite or False,
            "user_rating": base_item.user_rating,
            "custom_tags": [t.name for t in base_item.tags] if base_item.tags else [],
            "trailer_key": base_loc.trailer_url if base_loc else None,
            "path": base_item.current_path,
        }

        series_cast_map = {}

        for item in episodes_only:
            match = next((m for m in item.matches if m.is_active), None)
            if not match: continue

            # If it's literally the series folder, skip putting it in seasons
            if item.item_type == ItemType.SERIES:
                continue

            loc = None
            if match.localizations:
                if ui_lang:
                    loc = next((l for l in match.localizations if l.target_language == ui_lang), None)
                if not loc:
                    loc = next((l for l in match.localizations if l.is_primary), match.localizations[0])

            s_num = match.season_number if match.season_number is not None else item.fn_season
            e_num = match.episode_number if match.episode_number is not None else item.fn_episode

            if s_num is None: s_num = 1
            if e_num is None: e_num = 1
            if isinstance(e_num, list) and len(e_num) > 0: e_num = e_num[0]
            try:
                s_num = int(s_num)
                e_num = int(e_num)
            except:
                s_num = 1
                e_num = 1

            if s_num not in series_data["seasons"]:
                c_season = cached_seasons.get(s_num, {})
                s_poster = c_season.get("poster_path") or (loc.poster_path if loc else None)
                s_overview = c_season.get("overview")
                
                series_data["seasons"][s_num] = {
                    "season_number": s_num,
                    "title": loc.season_title if loc and loc.season_title else f"Season {s_num}",
                    "poster_path": s_poster,
                    "overview": s_overview,
                    "episodes": []
                }

            # Episode technical data
            technical = {
                "resolution": item.resolution,
                "video_codec": item.video_codec,
                "audio_codec": item.audio_codec,
                "audio_channels": item.audio_channels,
                "hdr_type": item.hdr_type,
                "bit_depth": item.bit_depth,
                "framerate": item.framerate,
                "duration": item.duration,
                "size_bytes": item.size,
                "source": item.source.value if item.source else None,
            }

            episode_data = {
                "id": item.id,
                "episode_number": e_num,
                "title": loc.episode_title if loc else (item.fn_title or f"Episode {e_num}"),
                "overview": loc.overview if loc else None,
                "still_path": loc.still_path if loc else None,
                "runtime": match.runtime,
                "rating_tmdb": match.rating_tmdb,
                "vote_count_tmdb": match.vote_count_tmdb,
                "path": item.current_path,
                "filename": item.filename,
                "technical": technical,
                "watch_count": getattr(item, "watch_count", 0),
                "is_watched": getattr(item, "is_watched", False),
                "resume_position": getattr(item, "resume_position", 0),
                "last_watched_at": getattr(item, "last_watched_at").isoformat() if getattr(item, "last_watched_at", None) else None
            }
            series_data["seasons"][s_num]["episodes"].append(episode_data)

            # Aggregate cast
            for link in match.people:
                person = link.person
                if person.id not in series_cast_map:
                    p_loc = person.localizations[0] if person.localizations else None
                    person_data = {
                        "id": person.id,
                        "name": p_loc.name if p_loc else "Unknown",
                        "character": link.character_name,
                        "job": link.job,
                        "profile_path": person.profile_path,
                        "popularity": person.popularity or 0,
                        "order": link.order
                    }
                    series_cast_map[person.id] = person_data

        # Sort seasons and episodes
        series_data["seasons"] = [series_data["seasons"][k] for k in sorted(series_data["seasons"].keys())]
        for s in series_data["seasons"]:
            def ep_sort(e):
                val = e["episode_number"]
                if isinstance(val, list) and len(val) > 0: val = val[0]
                try: return int(val)
                except: return 99
            s["episodes"].sort(key=ep_sort)

        # Split cast and directors
        for p in sorted(series_cast_map.values(), key=lambda x: x["order"]):
            if p["job"] in ("Director", "Creator"):
                series_data["directors"].append(p)
            elif p["job"] == "Actor":
                series_data["cast"].append(p)

        series_data["cast"] = series_data["cast"][:10]
        series_data["directors"] = series_data["directors"][:2]

        return JSONResponse(content=series_data, media_type="application/json; charset=utf-8")
    except Exception as e:
        import traceback
        logger.error(f"Error getting series detail: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        db.close()

@router.post("/item/{item_id}/retry-image")
def retry_item_image(item_id: int):
    """Forces a redownload of the image for a specific item by resetting its local paths and status."""
    from app.db.models import MediaItem, ItemType, ImageStatus
    db = Session()
    try:
        item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item:
            return {"error": "Item not found"}
            
        match = next((m for m in item.matches if m.is_active), None)
        if not match:
            return {"error": "No active match found for item"}
            
        # Clear local image paths to force redownload
        for loc in match.localizations:
            if item.item_type == ItemType.EPISODE:
                loc.local_still_path = None
                loc.local_all_stills = None
            else:
                loc.local_poster_path = None
                loc.local_series_poster_path = None
                loc.local_backdrop_path = None
                loc.local_thumb_path = None

        match.image_status = ImageStatus.PENDING
        db.commit()
        return {"status": "success", "message": "Image queued for retry"}
    finally:
        db.close()


@router.get("/people")
def get_people(
    search: str = None,
    role: str = None,
    sort_by: str = "library_count"
):
    """Returns a list of all people associated with organized library items."""
    db = Session()
    try:
        from app.db.models import Person, MediaPersonLink, MediaMatch, MediaItem, ItemStatus
        from sqlalchemy import func
        
        # 1. matched aktív matchek ID-jai
        matched_match_ids = [
            m.id for m in db.query(MediaMatch).join(MediaItem).filter(
                MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
            ).filter(MediaMatch.is_active == True).all()
        ]
        
        # 2. Személyek és könyvtár-előfordulási darabszám lekérdezése LEFT OUTER JOIN-nal
        join_cond = MediaPersonLink.person_id == Person.id
        if matched_match_ids:
            join_cond = (MediaPersonLink.person_id == Person.id) & (MediaPersonLink.media_match_id.in_(matched_match_ids))
        else:
            join_cond = (MediaPersonLink.person_id == Person.id) & (False)

        query = db.query(
            Person,
            func.count(MediaPersonLink.id).label("library_count")
        ).outerjoin(
            MediaPersonLink, join_cond
        )
        
        if role == "Actor":
            query = query.filter((MediaPersonLink.job == "Actor") | (Person.known_for_department == "Acting"))
        elif role == "Director":
            query = query.filter((MediaPersonLink.job.in_(["Director", "Creator"])) | (Person.known_for_department.in_(["Directing", "Writing", "Creator"])))
            
        query = query.group_by(Person.id)
        results = query.all()
        
        people_list = []
        for person, library_count in results:
            # Csak aktív személyek VAGY könyvtári egyezéssel rendelkező személyek
            if not person.is_active and library_count == 0:
                continue
                
            loc = person.localizations[0] if person.localizations else None
            name = loc.name if loc else "Unknown"
            
            # Keresés szűrés
            if search and search.lower() not in name.lower():
                continue
                
            people_list.append({
                "id": person.id,
                "name": name,
                "profile_path": person.profile_path,
                "popularity": person.popularity or 0.0,
                "is_active": person.is_active,
                "is_favorite": person.is_favorite,
                "user_rating": person.user_rating,
                "library_count": library_count,
                "known_for": person.known_for_department
            })
            
        # Rendezési logika
        if sort_by == "library_count":
            people_list.sort(key=lambda x: (-x["library_count"], -x["popularity"]))
        elif sort_by == "popularity":
            people_list.sort(key=lambda x: (-x["popularity"], -x["library_count"]))
        elif sort_by == "name":
            people_list.sort(key=lambda x: x["name"].lower())
            
        return people_list
    except Exception as e:
        import traceback
        logger.error(f"Error getting people list: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


@router.get("/people/search-tmdb")
def search_people_tmdb(query: str, language: str = None):
    """Searches the TMDB API for people (actors/directors)."""
    db = Session()
    try:
        from app.api.tmdb_client import TMDBClient
        from app.db.models import UserSetting
        
        # Get language settings if not specified
        if not language:
            lang_setting = db.query(UserSetting).filter(UserSetting.key == "metadata_primary_language").first()
            language = lang_setting.value if lang_setting else "en-US"
            
        client = TMDBClient(db)
        results = client.search_person(query=query, language=language)
        return results
    except Exception as e:
        logger.error(f"Error searching TMDB people: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


@router.post("/people/add-tmdb")
def add_person_tmdb(payload: dict):
    """Fetches a person by TMDB ID, creates/updates them in the DB, sets as active, and enriches metadata in all configured languages."""
    tmdb_id = payload.get("tmdb_id")
    if not tmdb_id:
        return JSONResponse(status_code=400, content={"error": "tmdb_id is required"})
        
    db = Session()
    try:
        from app.api.tmdb_client import TMDBClient
        from app.services.person_service import PersonService
        from app.db.models import Person, UserSetting
        
        client = TMDBClient(db)
        person_service = PersonService(db)
        
        # 1. Fetch configured primary and fallback languages
        primary_lang = db.query(UserSetting).filter(UserSetting.key == "metadata_primary_language").first()
        fallback_lang = db.query(UserSetting).filter(UserSetting.key == "metadata_fallback_language").first()
        
        langs = []
        if primary_lang and primary_lang.value:
            langs.append(primary_lang.value)
        if fallback_lang and fallback_lang.value and fallback_lang.value not in langs:
            langs.append(fallback_lang.value)
        if not langs:
            langs = ["en-US"]
            
        # Use first language to fetch initial person data
        tmdb_data = client.get_person_details(tmdb_id, language=langs[0])
        if not tmdb_data or "id" not in tmdb_data:
            return JSONResponse(status_code=404, content={"error": "Person not found on TMDB"})
            
        # 2. Get or create person in DB
        person = person_service.get_or_create_person(tmdb_data)
        
        # 3. Explicitly set to active (so they appear in the catalog immediately!)
        person.is_active = True
        
        # 4. Save initially so we have the record
        db.commit()
        
        # 5. Enrich metadata in all configured languages
        person_service.enrich_person_metadata(person.id, languages=langs)
        
        # Re-query to get fully enriched localizations
        person = db.query(Person).filter(Person.id == tmdb_id).first()
        loc = person.localizations[0] if person.localizations else None
        
        return JSONResponse(content={
            "id": person.id,
            "name": loc.name if loc else tmdb_data.get("name", "Unknown"),
            "profile_path": person.profile_path,
            "popularity": person.popularity or 0.0,
            "is_active": person.is_active,
            "is_favorite": person.is_favorite,
            "user_rating": person.user_rating,
            "library_count": 0,
            "known_for": person.known_for_department
        })
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding TMDB person: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


@router.get("/people/{person_id}")
def get_person_detail(person_id: int):
    """Returns comprehensive detail data for a single person, including their biography and associated library items."""
    db = Session()
    try:
        from app.db.models import Person, MediaPersonLink, MediaMatch, MediaItem, ItemStatus, ItemType, UserSetting
        from sqlalchemy.orm import joinedload
        
        person = db.query(Person).options(
            joinedload(Person.localizations)
        ).filter(Person.id == person_id).first()
        
        if not person:
            return JSONResponse(status_code=404, content={"error": "Person not found"})
            
        # Determine UI language
        ui_lang_setting = db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
        ui_lang = ui_lang_setting.value if ui_lang_setting and ui_lang_setting.value != "none" else None

        # Ensure we have rich metadata for the person (language support)
        target_lang = ui_lang or "en"
        fetched_langs = (person.fetched_languages or "").split(",")
        if target_lang not in fetched_langs or not person.images:
            try:
                from app.services.person_service import PersonService
                person_service = PersonService(db)
                enriched_person = person_service.enrich_person_metadata(person_id, [target_lang, "en"])
                if enriched_person:
                    person = enriched_person
            except Exception as e:
                logger.error(f"Failed to dynamically enrich person {person_id}: {e}")

        # Get best person localization
        loc = None
        if person.localizations:
            if ui_lang:
                loc = next((l for l in person.localizations if l.language == ui_lang), None)
                if not loc:
                    ui_lang_short = ui_lang.split("-")[0]
                    loc = next((l for l in person.localizations if l.language == ui_lang_short or l.language.split("-")[0] == ui_lang_short), None)
            if not loc:
                loc = person.localizations[0]
                
        # Query associated library items
        links = db.query(MediaPersonLink).join(MediaPersonLink.media_match).join(MediaMatch.media_item).filter(
            MediaPersonLink.person_id == person_id,
            MediaMatch.is_active == True,
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
        ).options(
            joinedload(MediaPersonLink.media_match).joinedload(MediaMatch.media_item),
            joinedload(MediaPersonLink.media_match).joinedload(MediaMatch.localizations)
        ).all()
        
        movies = []
        series_map = {}
        person_backdrop = None
        
        for link in links:
            item = link.media_match.media_item
            match = link.media_match
            
            # Get best item localization
            item_loc = None
            if match.localizations:
                if ui_lang:
                    item_loc = next((l for l in match.localizations if l.target_language == ui_lang), None)
                if not item_loc:
                    item_loc = next((l for l in match.localizations if l.is_primary), match.localizations[0])
                    
            if item_loc and item_loc.backdrop_path and not person_backdrop:
                person_backdrop = item_loc.backdrop_path
                
            title = item_loc.title if item_loc else item.fn_title or item.filename
            poster_path = item_loc.poster_path if item_loc else None
            
            if item.item_type == ItemType.MOVIE:
                movies.append({
                    "id": item.id,
                    "title": title,
                    "type": item.item_type.value,
                    "year": match.release_date.year if match.release_date else None,
                    "poster_path": poster_path,
                    "rating": match.rating_tmdb or 0.0,
                    "job": link.job,
                    "character": link.character_name
                })
            else:  # Episode or Series
                series_title = (item_loc.series_title if item_loc else None) or title
                sid = match.series_tmdb_id or series_title
                if sid not in series_map:
                    series_map[sid] = {
                        "id": f"series_{sid}",
                        "series_tmdb_id": match.series_tmdb_id,
                        "title": series_title,
                        "type": "series",
                        "year": match.first_air_date.year if match.first_air_date else (match.release_date.year if match.release_date else None),
                        "poster_path": item_loc.series_poster_path if item_loc and item_loc.series_poster_path else poster_path,
                        "rating": match.rating_tmdb or 0.0,
                        "job": link.job,
                        "character": link.character_name,
                        "episode_count": 0
                    }
                series_map[sid]["episode_count"] += 1
                
        # Mark local items with in_library = True
        for m in movies:
            m["in_library"] = True
            m["library_item_id"] = m["id"]
        for s in series_map.values():
            s["in_library"] = True
            s["library_series_tmdb_id"] = s["series_tmdb_id"]

        # Now, try to query TMDB combined_credits
        all_movies = movies
        all_series = list(series_map.values())
        
        try:
            from app.api.tmdb_client import TMDBClient
            tmdb_client = TMDBClient(db)
            tmdb_data = tmdb_client.get_person_details(person_id, language=target_lang)
            credits_data = tmdb_data.get("combined_credits", {})
            cast_list = credits_data.get("cast", [])
            crew_list = credits_data.get("crew", [])
            
            if cast_list or crew_list:
                # Cache local maps
                # Let's map active movie TMDB IDs in library
                local_movies = db.query(MediaMatch.tmdb_id, MediaItem.id).join(MediaMatch.media_item).filter(
                    MediaMatch.is_active == True,
                    MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
                    MediaItem.item_type == ItemType.MOVIE
                ).all()
                local_movies_map = {m.tmdb_id: m.id for m in local_movies if m.tmdb_id}

                # Let's map active series TMDB IDs in library
                local_series = db.query(MediaMatch.series_tmdb_id).join(MediaMatch.media_item).filter(
                    MediaMatch.is_active == True,
                    MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
                    MediaItem.item_type == ItemType.SERIES
                ).all()
                local_series_set = {s.series_tmdb_id for s in local_series if s.series_tmdb_id}

                combined_credits = {}
                for credit in cast_list + crew_list:
                    cid = credit.get("id")
                    media_type = credit.get("media_type")
                    if not cid or not media_type:
                        continue
                        
                    key = (cid, media_type)
                    
                    role = ""
                    if "character" in credit and credit["character"]:
                        role = f"as {credit['character']}"
                    elif "job" in credit and credit["job"]:
                        role = credit["job"]
                    else:
                        role = "Actor" if media_type == "movie" else "Cast"
                        
                    if key not in combined_credits:
                        date_str = credit.get("release_date") if media_type == "movie" else credit.get("first_air_date")
                        year = None
                        if date_str:
                            try:
                                year = int(date_str.split("-")[0])
                            except:
                                pass
                        
                        title = credit.get("title") if media_type == "movie" else credit.get("name")
                        
                        in_library = False
                        library_item_id = None
                        library_series_tmdb_id = None
                        
                        if media_type == "movie":
                            if cid in local_movies_map:
                                in_library = True
                                library_item_id = local_movies_map[cid]
                        elif media_type == "tv":
                            if cid in local_series_set:
                                in_library = True
                                library_series_tmdb_id = cid
                                
                        combined_credits[key] = {
                            "id": cid,
                            "title": title or "Unknown",
                            "type": "movie" if media_type == "movie" else "series",
                            "year": year,
                            "poster_path": credit.get("poster_path"),
                            "rating": credit.get("vote_average") or 0.0,
                            "roles": [role],
                            "in_library": in_library,
                            "library_item_id": library_item_id,
                            "library_series_tmdb_id": library_series_tmdb_id
                        }
                    else:
                        if role and role not in combined_credits[key]["roles"]:
                            combined_credits[key]["roles"].append(role)

                parsed_movies = []
                parsed_series = []
                for credit in combined_credits.values():
                    credit["job"] = ", ".join(credit["roles"])
                    del credit["roles"]
                    
                    if credit["type"] == "movie":
                        parsed_movies.append(credit)
                    else:
                        parsed_series.append(credit)
                        
                all_movies = parsed_movies
                all_series = parsed_series
        except Exception as ex:
            logger.error(f"Failed to load or parse TMDB credits for person {person_id}: {ex}")

        # Sort films and series by year descending
        all_movies.sort(key=lambda x: x.get("year") or 0, reverse=True)
        all_series.sort(key=lambda x: x.get("year") or 0, reverse=True)
        
        result = {
            "id": person.id,
            "name": loc.name if loc else "Unknown",
            "biography": loc.biography if loc else None,
            "birthday": person.birthday,
            "deathday": person.deathday,
            "place_of_birth": person.place_of_birth,
            "gender": person.gender,
            "popularity": person.popularity or 0.0,
            "known_for_department": person.known_for_department,
            "profile_path": person.profile_path,
            "backdrop_path": person_backdrop,
            "is_active": person.is_active,
            "is_favorite": person.is_favorite,
            "user_rating": person.user_rating,
            "custom_tags": person.custom_tags or [],
            "images": person.images or [],
            "movies": all_movies,
            "series": all_series
        }
        
        return JSONResponse(content=result, media_type="application/json; charset=utf-8")
    except Exception as e:
        import traceback
        logger.error(f"Error getting person detail: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        db.close()


@router.post("/people/{person_id}/status")
def update_person_status(person_id: int, payload: dict):
    """Updates the status (is_active, is_favorite, user_rating) of a person."""
    db = Session()
    try:
        from app.db.models import Person
        person = db.query(Person).filter(Person.id == person_id).first()
        if not person:
            return JSONResponse(status_code=404, content={"error": "Person not found"})
            
        if "is_active" in payload:
            person.is_active = bool(payload["is_active"])
        if "is_favorite" in payload:
            person.is_favorite = bool(payload["is_favorite"])
        if "user_rating" in payload:
            rating = payload["user_rating"]
            person.user_rating = int(rating) if rating is not None else None
        if "custom_tags" in payload:
            person.custom_tags = payload["custom_tags"]
            
        db.commit()
        return {
            "status": "success",
            "is_active": person.is_active,
            "is_favorite": person.is_favorite,
            "user_rating": person.user_rating,
            "custom_tags": person.custom_tags or []
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating person status: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


@router.post("/people/{person_id}/profile")
def update_person_profile(person_id: int, payload: dict):
    """Updates the profile picture of a person, downloading it if not present locally."""
    db = Session()
    try:
        from app.db.models import Person, ImageStatus
        from app.services.asset_service import AssetService
        
        person = db.query(Person).filter(Person.id == person_id).first()
        if not person:
            return JSONResponse(status_code=404, content={"error": "Person not found"})
            
        profile_path = payload.get("profile_path")
        if not profile_path:
            return JSONResponse(status_code=400, content={"error": "profile_path is required"})
            
        # 1. Update remote path
        person.profile_path = profile_path
        
        # 2. Download the image locally
        asset_service = AssetService()
        local_path = asset_service.download_image(profile_path, "persons", size="h632")
        if local_path:
            person.local_profile_path = local_path
            person.image_status = ImageStatus.COMPLETED
        else:
            person.image_status = ImageStatus.FAILED
            
        db.commit()
        return {"status": "success", "profile_path": profile_path}
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error updating person profile: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


from fastapi import UploadFile, File
import shutil
import os
import uuid

@router.post("/people/{person_id}/upload-profile")
def upload_person_profile(person_id: int, file: UploadFile = File(...)):
    """Uploads a local image file directly as the person's profile picture."""
    db = Session()
    try:
        from app.db.models import Person, ImageStatus
        person = db.query(Person).filter(Person.id == person_id).first()
        if not person:
            return JSONResponse(status_code=404, content={"error": "Person not found"})
            
        # Ensure directory exists
        os.makedirs("data/media/images/persons", exist_ok=True)
        
        # Save file
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"/{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join("data/media/images/persons", filename.lstrip("/"))
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        person.local_profile_path = filename
        person.profile_path = filename
        person.image_status = ImageStatus.COMPLETED
        
        db.commit()
        return {"status": "success", "local_profile_path": filename}
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error uploading profile: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


@router.post("/item/{item_id}/status")
def update_item_status(item_id: int, payload: dict):
    """Updates the status (is_favorite, user_rating) of a media item."""
    db = Session()
    try:
        from app.db.models import MediaItem
        item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found"})

        if "is_favorite" in payload:
            item.is_favorite = bool(payload["is_favorite"])
        if "user_rating" in payload:
            rating = payload["user_rating"]
            item.user_rating = int(rating) if rating is not None else None
        if "custom_tags" in payload:
            from app.db.models.media import Tag
            new_tag_names = [str(t).strip() for t in payload["custom_tags"] if str(t).strip()]
            
            # Create missing tags
            for name in new_tag_names:
                existing = db.query(Tag).filter(Tag.name == name).first()
                if not existing:
                    new_tag = Tag(name=name)
                    db.add(new_tag)
            db.commit()
            
            # Fetch tags and associate
            if new_tag_names:
                actual_tags = db.query(Tag).filter(Tag.name.in_(new_tag_names)).all()
                item.tags = actual_tags
            else:
                item.tags = []
            # Legacy fallback removed
                
        db.commit()
        return JSONResponse(content={
            "id": item.id,
            "is_favorite": item.is_favorite,
            "user_rating": item.user_rating,
            "custom_tags": [t.name for t in item.tags] if item.tags else [],
            "tags": [{"id": t.id, "name": t.name, "color": t.color} for t in item.tags]
        })
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating item status: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


@router.post("/media/bulk-tags")
def bulk_update_item_tags(payload: dict):
    """Bulk adds or removes tags from multiple media items."""
    item_ids = payload.get("item_ids", [])
    add_tag_names = [str(t).strip() for t in payload.get("add_tags", []) if str(t).strip()]
    remove_tag_names = [str(t).strip() for t in payload.get("remove_tags", []) if str(t).strip()]
    
    if not item_ids:
        return JSONResponse(status_code=400, content={"error": "item_ids list is required"})
        
    db = Session()
    try:
        from app.db.models.media import MediaItem, Tag
        
        # 1. Create any missing tags that are to be added
        for name in add_tag_names:
            existing = db.query(Tag).filter(Tag.name == name).first()
            if not existing:
                new_tag = Tag(name=name)
                db.add(new_tag)
        db.commit()
        
        # Fetch the Tag entities to add/remove
        tags_to_add = db.query(Tag).filter(Tag.name.in_(add_tag_names)).all() if add_tag_names else []
        tags_to_remove = db.query(Tag).filter(Tag.name.in_(remove_tag_names)).all() if remove_tag_names else []
        
        # 2. Update each media item
        items = db.query(MediaItem).filter(MediaItem.id.in_(item_ids)).all()
        for item in items:
            current_tags_map = {t.id: t for t in item.tags}
            
            # Remove tags
            for t_rem in tags_to_remove:
                if t_rem.id in current_tags_map:
                    item.tags.remove(current_tags_map[t_rem.id])
            
            # Add tags
            for t_add in tags_to_add:
                if t_add.id not in current_tags_map:
                    item.tags.append(t_add)
                    
        db.commit()
        return {"status": "success", "updated_count": len(items)}
    except Exception as e:
        db.rollback()
        logger.error(f"Error bulk updating item tags: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()


