from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.db.base import Session
from app.db.models import MediaItem, ItemStatus, ExtraFile
from app.renamer.renamer_engine import RenamerEngine
from app.scanner.scanner_manager import scan_status
from app.formatter.formatter import Formatter, FormatterConfig
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def run_organize_task():
    """Background task for physical renaming and organization."""
    db = Session()
    global scan_status
    try:
        engine = RenamerEngine(db)
        formatter = Formatter(FormatterConfig.from_db(db))
        
        # Get all identified items that are NOT yet renamed
        items = db.query(MediaItem).filter(
            MediaItem.status == ItemStatus.MATCHED
        ).all()
        
        if not items:
            scan_status["active"] = False
            return

        # Create a batch for this operation
        from app.db.models import ActionBatch
        batch = ActionBatch(name=f"Organize {len(items)} items")
        db.add(batch)
        db.commit()

        scan_status.update({
            "active": True,
            "phase": "organizing",
            "current": 0,
            "total": len(items),
            "start_time": time.time()
        })

        for item in items:
            # Re-calculate planned path to be sure it's up to date
            active_match = next((m for m in item.matches if m.is_active), None)
            if not active_match:
                scan_status["current"] += 1
                continue
            
            loc = active_match.localizations[0] if active_match.localizations else None
            preview = formatter.format_item(item, active_match, loc)
            
            # Execute physical move
            # execute_single handles the DB update and extras too
            success = engine.execute_single(preview, batch.id)
            
            scan_status["current"] += 1
            if not success:
                logger.error(f"Failed to organize item: {item.filename}")

        logger.info("Library organization complete.")
    except Exception as e:
        import traceback
        logger.error(f"Organize task failed: {e}")
        logger.error(traceback.format_exc())
    finally:
        scan_status["active"] = False
        scan_status["phase"] = "idle"
        db.close()

@router.post("/rename/start")
def start_rename(background_tasks: BackgroundTasks):
    """Triggers the organization process for all matched items."""
    db = Session()
    try:
        # Check if already running
        if scan_status.get("active") and scan_status.get("phase") == "organizing":
            raise HTTPException(status_code=400, detail="Organization already in progress")
            
        # Check for items
        matched_count = db.query(MediaItem).filter(MediaItem.status == ItemStatus.MATCHED).count()
        if matched_count == 0:
            return {"status": "error", "message": "No matched items to organize"}

        background_tasks.add_task(run_organize_task)
        return {"status": "success", "message": f"Organizing {matched_count} items"}
    finally:
        db.close()

@router.get("/history")
def get_history():
    """Returns a list of past organization batches and their logs."""
    db = Session()
    try:
        from app.db.models import ActionBatch, ActionLog, ActionStatus
        from sqlalchemy import desc, func
        
        batches = db.query(ActionBatch).order_by(desc(ActionBatch.created_at)).all()
        
        result = []
        for b in batches:
            success_count = db.query(ActionLog).filter(
                ActionLog.batch_id == b.id, 
                ActionLog.status == ActionStatus.SUCCESS
            ).count()
            
            failed_count = db.query(ActionLog).filter(
                ActionLog.batch_id == b.id, 
                ActionLog.status == ActionStatus.FAILED
            ).count()

            result.append({
                "id": b.id,
                "name": b.name or f"Batch #{b.id}",
                "created_at": b.created_at.isoformat(),
                "success_count": success_count,
                "failed_count": failed_count,
                "status": "completed" if failed_count == 0 else "partial"
            })
            
        return result
    finally:
        db.close()

@router.post("/rename/undo/{batch_id}")
def undo_rename(batch_id: int):
    """Reverts a past organization batch."""
    db = Session()
    try:
        engine = RenamerEngine(db)
        undo_count = engine.undo_batch(batch_id)
        return {"status": "success", "message": f"Successfully reverted {undo_count} operations"}
    except Exception as e:
        logger.error(f"Undo failed: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
