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

from app.db.base import Session
from app.db.models import *

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/library/stats")
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

@router.get("/library/series/{series_tmdb_id}")
def get_library_series_detail(series_tmdb_id: str, background_tasks: BackgroundTasks):
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
                
            credits = tmdb_data.get("aggregate_credits", {})
            if not credits or not credits.get("cast"):
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
                char = actor.get("roles", [{}])[0].get("character") if "roles" in actor else actor.get("character")
                cast.append({
                    "id": actor.get("id"),
                    "name": actor.get("name"),
                    "character": char,
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

        # Check and download missing season posters
        for s_info in series_data["seasons"].values():
            s_poster = s_info.get("poster_path")
            if s_poster:
                filename = s_poster.lstrip("/")
                local_file = Path("data/media/images/posters") / filename
                if not local_file.exists() or local_file.stat().st_size < 100:
                    def download_missing_poster(poster_path):
                        from app.services.asset_service import AssetService
                        asset_service = AssetService()
                        asset_service.download_image(poster_path, "posters", size="w500")
                    
                    background_tasks.add_task(download_missing_poster, s_poster)

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
