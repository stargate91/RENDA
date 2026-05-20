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

from app.db.base import Session
from app.db.models import *

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/media/update")
def update_media_item(payload: dict):
    """Updates media item or extra file properties manually."""
    db = Session()
    try:
        from app.db.models import MediaItem, ExtraFile, ItemType
        from app.formatter.formatter import Formatter, FormatterConfig
        
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

        formatter = Formatter(FormatterConfig.from_db(db))
        active_match = next((m for m in item.matches if m.is_active), None)
        if active_match:
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

@router.post("/media/bulk-tags")
def bulk_update_item_tags(payload: dict):
    """Bulk adds or removes tags from multiple media items."""
    raw_item_ids = payload.get("item_ids", [])
    item_ids = []
    for raw_id in raw_item_ids:
        try:
            item_ids.append(int(raw_id))
        except (TypeError, ValueError):
            logger.warning(f"Ignoring non-media item id in bulk tag update: {raw_id}")

    add_tag_names = list(dict.fromkeys(str(t).strip() for t in payload.get("add_tags", []) if str(t).strip()))
    remove_tag_names = list(dict.fromkeys(str(t).strip() for t in payload.get("remove_tags", []) if str(t).strip()))
    
    if not item_ids:
        return JSONResponse(status_code=400, content={"error": "No valid media item ids provided"})
        
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
        if not items:
            return JSONResponse(status_code=404, content={"error": "No matching media items found"})

        updated_count = 0
        for item in items:
            current_tags_map = {t.id: t for t in item.tags}
            changed = False
            
            # Remove tags
            for t_rem in tags_to_remove:
                if t_rem.id in current_tags_map:
                    item.tags.remove(current_tags_map[t_rem.id])
                    changed = True
            
            # Add tags
            for t_add in tags_to_add:
                if t_add.id not in current_tags_map:
                    item.tags.append(t_add)
                    changed = True

            if changed:
                updated_count += 1
                    
        db.commit()
        return {
            "status": "success",
            "matched_count": len(items),
            "updated_count": updated_count,
            "added_tags": [t.name for t in tags_to_add],
            "removed_tags": [t.name for t in tags_to_remove]
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error bulk updating item tags: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()
