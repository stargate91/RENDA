from fastapi import APIRouter
from app.db.base import Session
from app.db.models import *

router = APIRouter()

from sqlalchemy import func
from sqlalchemy.orm import joinedload
from fastapi.responses import JSONResponse
import os
import logging
logger = logging.getLogger(__name__)

@router.get("/stats")
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
        # Storage: ALL media items
        items = db.query(MediaItem.current_path, MediaItem.size).all()
        total_bytes = sum(i.size for i in items if i.size)
        
        # Calculate dynamic drive count
        drives = set()
        for i in items:
            if i.current_path:
                if ":" in i.current_path:
                    drives.add(i.current_path.split(":")[0].upper() + ":")
                elif i.current_path.startswith("/"):
                    parts = i.current_path.split("/")
                    if len(parts) > 2 and parts[1] in ["mnt", "media", "Volumes"]:
                        drives.add("/" + parts[1] + "/" + parts[2])
                    else:
                        drives.add("/")
        
        drive_count = len(drives) if drives else 0

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
            "drive_count": drive_count,
            "unmatched": unmatched
        }
    finally:
        db.close()


@router.get("/discovery")
def get_discovery_items():
    """Returns grouped discovery items for the UI."""
    db = Session()
    try:
        # Lekérjük az összes releváns médiaelemet a kapcsolódó adatokkal együtt
        from sqlalchemy.orm import joinedload
        from app.formatter.formatter import Formatter, FormatterConfig
        config = FormatterConfig.from_db(db)
        formatter = Formatter(config)

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

            # matches_info for manual resolver
            matches_info = []
            for m in item.matches:
                loc = m.localizations[0] if m.localizations else None
                matches_info.append({
                    "id": m.id,
                    "tmdb_id": m.tmdb_id,
                    "type": m.item_type.value if m.item_type else "movie",
                    "title": loc.title if loc else (loc.series_title if loc else ""),
                    "year": m.release_date.year if m.release_date else (m.first_air_date.year if m.first_air_date else None),
                    "poster_path": loc.poster_path if loc else None,
                    "vote_average": m.rating_tmdb,
                    "overview": loc.overview if loc else "",
                    "is_active": m.is_active,
                    "confidence": m.confidence_score
                })

            # Dinamikus tervezett útvonal kiszámítása, ha matched
            p_path = item.planned_path
            if (item.status in [ItemStatus.MATCHED, ItemStatus.RENAMED, ItemStatus.ORGANIZED]) and active_matches:
                try:
                    am = active_matches[0]
                    loc = am.localizations[0] if am.localizations else None
                    if loc:
                        preview = formatter.format_item(item, am, loc)
                        if preview.target_subpath:
                            p_path = f"{preview.target_subpath}/{preview.target_name}".replace("\\", "/")
                        else:
                            p_path = preview.target_name
                except Exception as ex:
                    logger.warning(f"Failed to calculate planned path for item {item.id}: {ex}")

            data = {
                "id": item.id,
                "filename": item.filename,
                "folder": item.folder_name,
                "status": item.status.value,
                "type": item.item_type.value if item.item_type else "unknown",
                "title": item.fn_title or item.fd_title or item.filename,
                "year": item.fn_year or item.fd_year,
                "planned_path": p_path,
                "extension": item.extension,
                "size_mb": round(item.size / (1024 * 1024), 2) if item.size else 0,
                "group_hash": item.group_hash,
                "images": all_images,
                "matches": matches_info,
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

        # PASS 1: Kiszámoljuk az összes tervezett útvonalat
        extra_paths = []
        path_counts = {}

        # Re-use the same formatter/config loaded above
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
        item_type = payload.get("type", "media") # 'media' or 'extra'
        updates = payload.get("updates", {})
        
        if item_type == "media":
            item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
            if not item:
                return JSONResponse(status_code=404, content={"error": "Media item not found"})
            
            # Update fields
            if "target_language" in updates: item.target_language = updates["target_language"]
            if "edition" in updates: item.edition = MovieEdition(updates["edition"])
            if "source" in updates: item.source = MediaSource(updates["source"])
            if "audio_type" in updates: item.audio_type = MediaAudioType(updates["audio_type"])
            
            # Special case: Season/Episode update (requires updating the active match)
            if "season" in updates or "episode" in updates:
                active_match = next((m for m in item.matches if m.is_active), None)
                if active_match:
                    if "season" in updates: active_match.season_number = updates["season"]
                    if "episode" in updates: active_match.episode_number = updates["episode"]
                    active_match.item_type = ItemType.EPISODE
                    item.item_type = ItemType.EPISODE

        else: # 'extra'
            extra = db.query(ExtraFile).filter(ExtraFile.id == item_id).first()
            if not extra:
                return JSONResponse(status_code=404, content={"error": "Extra file not found"})
            
            if "subtype" in updates: extra.subtype = ExtraSubtype(updates["subtype"])
            if "language" in updates: extra.language = updates["language"]
            item = extra.parent_item

        # Re-calculate planned path
        formatter = Formatter.from_db(db)
        active_match = next((m for m in item.matches if m.is_active), None)
        if active_match:
            # Use enrichment logic to refresh paths
            from app.scanner.metadata_enricher import MetadataEnricher
            enricher = MetadataEnricher(db)
            # We don't need full enrichment, just a re-plan
            preview = formatter.plan_rename(active_match, "")
            item.planned_path = preview.target_subpath + "/" + preview.target_name
            
            # Also update extras' planned paths
            for extra_prev in preview.extra_previews:
                ex_item = db.query(ExtraFile).filter(ExtraFile.id == extra_prev.extra_id).first()
                if ex_item:
                    # Not stored in DB directly yet, but the discovery API re-calculates it anyway
                    pass

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
