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
