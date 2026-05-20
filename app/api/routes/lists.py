from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.db.base import Session as DBSession
from app.db.models.media import CustomList, CustomListItem, MediaItem
from app.db.models.metadata import MediaMatch
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/lists")
def get_all_lists():
    db = DBSession()
    try:
        # Automatically seed the standard Watchlist if it doesn't exist
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

        lists = db.query(CustomList).all()
        result = []
        for l in lists:
            # Get item count
            item_count = db.query(CustomListItem).filter(CustomListItem.list_id == l.id).count()
            # Get up to 4 sample poster paths for a nice card preview
            items = db.query(CustomListItem).filter(CustomListItem.list_id == l.id).order_by(CustomListItem.added_at.desc()).limit(4).all()
            posters = [item.poster_path for item in items if item.poster_path]
            
            result.append({
                "id": l.id,
                "name": l.name,
                "description": l.description,
                "color": l.color or "#3b82f6",
                "icon": l.icon or "ListVideo",
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "item_count": item_count,
                "sample_posters": posters
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching lists: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.post("/lists")
def create_list(payload: dict):
    db = DBSession()
    try:
        name = payload.get("name", "").strip()
        description = payload.get("description", "").strip() or None
        color = payload.get("color", "").strip() or "#3b82f6"
        icon = payload.get("icon", "").strip() or "ListVideo"
        
        if not name:
            return JSONResponse(status_code=400, content={"error": "List name is required"})
            
        existing = db.query(CustomList).filter(CustomList.name == name).first()
        if existing:
            return JSONResponse(status_code=400, content={"error": "A list with this name already exists"})
            
        new_list = CustomList(
            name=name,
            description=description,
            color=color,
            icon=icon
        )
        db.add(new_list)
        db.commit()
        
        return {
            "id": new_list.id,
            "name": new_list.name,
            "description": new_list.description,
            "color": new_list.color,
            "icon": new_list.icon,
            "created_at": new_list.created_at.isoformat() if new_list.created_at else None,
            "item_count": 0,
            "sample_posters": []
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating list: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.delete("/lists/{list_id}")
def delete_list(list_id: int):
    db = DBSession()
    try:
        custom_list = db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            return JSONResponse(status_code=404, content={"error": "List not found"})
            
        if custom_list.name == "Watchlist":
            return JSONResponse(status_code=400, content={"error": "The standard Watchlist cannot be deleted."})
            
        db.delete(custom_list)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting list {list_id}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.get("/lists/{list_id}")
def get_list_details(list_id: int):
    db = DBSession()
    try:
        custom_list = db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            return JSONResponse(status_code=404, content={"error": "List not found"})
            
        # Get all items in the list
        items = db.query(CustomListItem).filter(CustomListItem.list_id == list_id).order_by(CustomListItem.added_at.desc()).all()
        
        items_result = []
        for item in items:
            items_result.append({
                "id": item.id,
                "list_id": item.list_id,
                "tmdb_id": item.tmdb_id,
                "media_item_id": item.media_item_id,
                "media_type": item.media_type,
                "title": item.title,
                "poster_path": item.poster_path,
                "added_at": item.added_at.isoformat() if item.added_at else None
            })
            
        return {
            "id": custom_list.id,
            "name": custom_list.name,
            "description": custom_list.description,
            "color": custom_list.color,
            "icon": custom_list.icon,
            "created_at": custom_list.created_at.isoformat() if custom_list.created_at else None,
            "items": items_result
        }
    except Exception as e:
        logger.error(f"Error fetching list details {list_id}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.post("/lists/{list_id}/items")
def add_item_to_list(list_id: int, payload: dict):
    db = DBSession()
    try:
        custom_list = db.query(CustomList).filter(CustomList.id == list_id).first()
        if not custom_list:
            return JSONResponse(status_code=404, content={"error": "List not found"})
            
        tmdb_id = payload.get("tmdb_id")
        media_item_id = payload.get("media_item_id")
        media_type = payload.get("media_type", "movie")
        title = payload.get("title", "").strip()
        poster_path = payload.get("poster_path")
        
        # If media_item_id is provided, try to resolve details from library
        if media_item_id and not title:
            media_item = db.query(MediaItem).filter(MediaItem.id == media_item_id).first()
            if media_item:
                title = media_item.internal_title or media_item.filename
                # See if we can find a matched poster
                match = db.query(MediaMatch).filter(MediaMatch.media_item_id == media_item_id, MediaMatch.is_active == True).first()
                if match:
                    if not tmdb_id:
                        tmdb_id = match.tmdb_id
                    from app.db.models.metadata import MetadataLocalization
                    loc = db.query(MetadataLocalization).filter(MetadataLocalization.match_id == match.id).first()
                    if loc and loc.poster_path:
                        poster_path = loc.poster_path
                        
        if not title:
            return JSONResponse(status_code=400, content={"error": "Title is required"})
            
        # Check if already exists in this list
        query = db.query(CustomListItem).filter(CustomListItem.list_id == list_id)
        if tmdb_id:
            query = query.filter(CustomListItem.tmdb_id == tmdb_id)
        elif media_item_id:
            query = query.filter(CustomListItem.media_item_id == media_item_id)
        else:
            return JSONResponse(status_code=400, content={"error": "Either tmdb_id or media_item_id must be provided"})
            
        existing = query.first()
        if existing:
            return {
                "id": existing.id,
                "list_id": existing.list_id,
                "tmdb_id": existing.tmdb_id,
                "media_item_id": existing.media_item_id,
                "media_type": existing.media_type,
                "title": existing.title,
                "poster_path": existing.poster_path,
                "added_at": existing.added_at.isoformat() if existing.added_at else None
            }
            
        new_item = CustomListItem(
            list_id=list_id,
            tmdb_id=tmdb_id,
            media_item_id=media_item_id,
            media_type=media_type,
            title=title,
            poster_path=poster_path
        )
        db.add(new_item)
        db.commit()
        
        return {
            "id": new_item.id,
            "list_id": new_item.list_id,
            "tmdb_id": new_item.tmdb_id,
            "media_item_id": new_item.media_item_id,
            "media_type": new_item.media_type,
            "title": new_item.title,
            "poster_path": new_item.poster_path,
            "added_at": new_item.added_at.isoformat() if new_item.added_at else None
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding item to list: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.delete("/lists/{list_id}/items/{item_id}")
def remove_item_from_list(list_id: int, item_id: int):
    db = DBSession()
    try:
        item = db.query(CustomListItem).filter(CustomListItem.list_id == list_id, CustomListItem.id == item_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found in this list"})
            
        db.delete(item)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error removing item {item_id} from list {list_id}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.delete("/lists/{list_id}/items/by-tmdb/{tmdb_id}")
def remove_item_by_tmdb(list_id: int, tmdb_id: int):
    db = DBSession()
    try:
        item = db.query(CustomListItem).filter(CustomListItem.list_id == list_id, CustomListItem.tmdb_id == tmdb_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found in this list"})
            
        db.delete(item)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error removing tmdb item {tmdb_id} from list {list_id}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.delete("/lists/{list_id}/items/by-media-item/{media_item_id}")
def remove_item_by_media_item(list_id: int, media_item_id: int):
    db = DBSession()
    try:
        item = db.query(CustomListItem).filter(CustomListItem.list_id == list_id, CustomListItem.media_item_id == media_item_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found in this list"})
            
        db.delete(item)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error removing media item {media_item_id} from list {list_id}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.get("/lists/item-membership/{item_id}")
def get_item_membership(item_id: str):
    db = DBSession()
    try:
        tmdb_id = None
        media_item_id = None
        
        if item_id.startswith("tmdb_"):
            try:
                tmdb_id = int(item_id.split("_")[1])
            except ValueError:
                return JSONResponse(status_code=400, content={"error": "Invalid TMDB ID format"})
        else:
            try:
                media_item_id = int(item_id)
            except ValueError:
                return JSONResponse(status_code=400, content={"error": "Invalid item ID format"})
                
        # If it's a media item ID, see if we can resolve its TMDB ID too
        if media_item_id:
            media_item = db.query(MediaItem).filter(MediaItem.id == media_item_id).first()
            if media_item:
                match = db.query(MediaMatch).filter(MediaMatch.media_item_id == media_item_id, MediaMatch.is_active == True).first()
                if match:
                    tmdb_id = match.tmdb_id
                    
        # Now find all list IDs this item belongs to
        query = db.query(CustomListItem)
        if tmdb_id and media_item_id:
            query = query.filter((CustomListItem.tmdb_id == tmdb_id) | (CustomListItem.media_item_id == media_item_id))
        elif tmdb_id:
            query = query.filter(CustomListItem.tmdb_id == tmdb_id)
        elif media_item_id:
            query = query.filter(CustomListItem.media_item_id == media_item_id)
        else:
            return {"list_ids": []}
            
        list_items = query.all()
        # Return a list of custom list IDs
        list_ids = list(set([li.list_id for li in list_items]))
        return {"list_ids": list_ids}
    except Exception as e:
        logger.error(f"Error fetching item membership for {item_id}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()
