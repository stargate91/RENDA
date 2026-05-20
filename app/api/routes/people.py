from fastapi import APIRouter, UploadFile, File
import shutil
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
import uuid

from app.db.base import Session
from app.db.models import *

logger = logging.getLogger(__name__)
router = APIRouter()


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
                sid = match.series_tmdb_id or match.tmdb_id or series_title
                if sid not in series_map:
                    series_map[sid] = {
                        "id": f"series_{sid}",
                        "series_tmdb_id": match.series_tmdb_id or match.tmdb_id,
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
                local_series = db.query(MediaMatch.series_tmdb_id, MediaMatch.tmdb_id).join(MediaMatch.media_item).filter(
                    MediaMatch.is_active == True,
                    MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
                    MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE])
                ).all()
                local_series_set = set()
                for s in local_series:
                    if s.series_tmdb_id:
                        local_series_set.add(s.series_tmdb_id)
                    if s.tmdb_id:
                        local_series_set.add(s.tmdb_id)

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
