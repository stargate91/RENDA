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

        for ex, p_status, p_planned, p_filename in extras:
            # Ha matched, akkor a tervezett nevet használjuk, különben az eredetit
            raw_parent_name = p_planned if (p_status == ItemStatus.MATCHED and p_planned) else p_filename
            
            # SOHA ne küldjük át a kiterjesztést a szülő nevében az extrákhoz, mert megtévesztő az UI-on
            parent_name = os.path.splitext(raw_parent_name)[0]
                
            groups["extras"].append({
                "id": ex.id,
                "parent_id": ex.parent_item_id,
                "parent_name": parent_name,
                "filename": os.path.basename(ex.original_path),
                "extension": ex.extension,
                "category": ex.category.value,
                "subtype": ex.subtype.value if ex.subtype else "other",
                "language": ex.language,
                "path": ex.original_path
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
