from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.db.base import Session as DBSession
from app.db.models.media import Tag
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/tags")
def get_all_tags():
    db = DBSession()
    try:
        tags = db.query(Tag).all()
        return [{"id": t.id, "name": t.name, "color": t.color} for t in tags]
    except Exception as e:
        logger.error(f"Error fetching tags: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.post("/tags")
def create_tag(payload: dict):
    db = DBSession()
    try:
        name = payload.get("name", "").strip()
        color = payload.get("color", "#3b82f6")
        if not name:
            return JSONResponse(status_code=400, content={"error": "Name required"})
            
        existing = db.query(Tag).filter(Tag.name == name).first()
        if existing:
            return JSONResponse(status_code=400, content={"error": "Tag already exists"})
            
        tag = Tag(name=name, color=color)
        db.add(tag)
        db.commit()
        return {"id": tag.id, "name": tag.name, "color": tag.color}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.put("/tags/{tag_id}")
def update_tag(tag_id: int, payload: dict):
    db = DBSession()
    try:
        tag = db.query(Tag).filter(Tag.id == tag_id).first()
        if not tag:
            return JSONResponse(status_code=404, content={"error": "Not found"})
            
        if "name" in payload:
            name = payload["name"].strip()
            if name:
                existing = db.query(Tag).filter(Tag.name == name, Tag.id != tag_id).first()
                if existing:
                    return JSONResponse(status_code=400, content={"error": "Name already taken"})
                tag.name = name
                
        if "color" in payload:
            tag.color = payload["color"]
            
        db.commit()
        return {"id": tag.id, "name": tag.name, "color": tag.color}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int):
    db = DBSession()
    try:
        tag = db.query(Tag).filter(Tag.id == tag_id).first()
        if not tag:
            return JSONResponse(status_code=404, content={"error": "Not found"})
            
        db.delete(tag)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()
