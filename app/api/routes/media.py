from fastapi import APIRouter
from app.db.base import Session
from app.db.models import *

router = APIRouter()

from sqlalchemy import func
from sqlalchemy.orm import joinedload
from fastapi.responses import JSONResponse
import os
import logging
import platform
import subprocess
from pathlib import Path
logger = logging.getLogger(__name__)

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


@router.get("/library/item/{item_id}")
def get_library_item_detail(item_id: int):
    """Returns comprehensive detail data for a single library item (movie detail page)."""
    db = Session()
    try:
        from app.db.models import MediaItem, MediaMatch, UserSetting, Person, MediaPersonLink, PersonLocalization

        item = db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations),
            joinedload(MediaItem.matches).joinedload(MediaMatch.people).joinedload(MediaPersonLink.person).joinedload(Person.localizations)
        ).filter(MediaItem.id == item_id).first()
        
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
            "cast": cast[:20],  # Top 20 cast members
            "directors": directors,
            "technical": technical,
            "is_adult": active_match.is_adult,
        }

        return JSONResponse(content=result, media_type="application/json; charset=utf-8")
    except Exception as e:
        import traceback
        logger.error(f"Error getting library item detail: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        db.close()


@router.get("/library/series/{series_tmdb_id}")
def get_library_series_detail(series_tmdb_id: int):
    """Returns comprehensive detail data for a full series, including seasons and episodes."""
    db = Session()
    try:
        from app.db.models import MediaItem, MediaMatch, UserSetting, Person, MediaPersonLink, ItemStatus, ItemType, TMDBCache
        from sqlalchemy import or_, and_
        
        # Try to fetch full series metadata from cache
        tmdb_cache = db.query(TMDBCache).filter(
            TMDBCache.tmdb_id == series_tmdb_id,
            TMDBCache.cache_key.like(f"/tv/{series_tmdb_id}%")
        ).first()
        cached_series = tmdb_cache.raw_data if tmdb_cache else {}
        cached_seasons = {s.get("season_number"): s for s in cached_series.get("seasons", [])}
        
        # Find all episodes for this series
        items = db.query(MediaItem).join(MediaItem.matches).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations),
            joinedload(MediaItem.matches).joinedload(MediaMatch.people).joinedload(MediaPersonLink.person)
        ).filter(
            or_(
                MediaMatch.series_tmdb_id == series_tmdb_id,
                MediaMatch.tmdb_id == series_tmdb_id
            ),
            MediaMatch.is_active == True,
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
        ).all()

        if not items:
            return JSONResponse(status_code=404, content={"error": "Series not found or has no organized episodes"})

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
            "seasons": {}
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
                "technical": technical
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

        series_data["cast"] = series_data["cast"][:20]

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
        
        if not matched_match_ids:
            return []
            
        # 2. Személyek és könyvtár-előfordulási darabszám lekérdezése
        query = db.query(
            Person,
            func.count(MediaPersonLink.id).label("library_count")
        ).join(
            MediaPersonLink, MediaPersonLink.person_id == Person.id
        ).filter(
            MediaPersonLink.media_match_id.in_(matched_match_ids)
        )
        
        if role == "Actor":
            query = query.filter(MediaPersonLink.job == "Actor")
        elif role == "Director":
            query = query.filter(MediaPersonLink.job.in_(["Director", "Creator"]))
            
        query = query.group_by(Person.id)
        results = query.all()
        
        people_list = []
        for person, library_count in results:
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
            
        db.commit()
        return {
            "status": "success",
            "is_active": person.is_active,
            "is_favorite": person.is_favorite,
            "user_rating": person.user_rating
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating person status: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()
