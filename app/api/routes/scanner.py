from fastapi import APIRouter
from app.db.base import Session
from app.db.models import *

router = APIRouter()

from pydantic import BaseModel
from typing import List
from fastapi import BackgroundTasks
from app.scanner.scanner_manager import ScannerManager, scan_status

class ScanRequest(BaseModel):
    paths: List[str]

@router.get("/scan-status")
def get_scan_status():
    """Returns the current progress of the background scan."""
    return scan_status


@router.get("/image-status")
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


@router.post("/scan")
def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    """Triggers a library scan in the background."""
    from app.utils.logger import logger
    logger.info(f"Received scan request for paths: {request.paths}")
    
    import time
    scan_status.update({
        "active": True,
        "phase": "collecting",
        "current": 0,
        "total": 0,
        "start_time": time.time()
    })
    
    def run_scan():
        logger.info("Background scan task starting...")
        db = Session()
        try:
            from app.db.models import UserSetting
            min_size = 500
            try:
                setting = db.query(UserSetting).filter(UserSetting.key == "min_video_size_mb").first()
                if setting and setting.value: min_size = int(setting.value)
            except: pass
            
            scanner = ScannerManager(db, min_video_size_mb=min_size)
            scanner.scan_and_save(request.paths)
            logger.info("Background scan task completed successfully.")
        except Exception as e:
            import traceback
            logger.error(f"Background scan task failed: {e}")
            logger.error(traceback.format_exc())
        finally:
            db.close()
    
    background_tasks.add_task(run_scan)
    return {"message": "Scan started in background", "paths": request.paths}


