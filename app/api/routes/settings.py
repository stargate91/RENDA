from fastapi import APIRouter
from app.db.base import Session
from app.db.models import *

router = APIRouter()



@router.get("/settings")
def get_settings():
    db = Session()
    try:
        settings = db.query(UserSetting).all()
        return {s.key: s.value for s in settings}
    finally:
        db.close()


@router.post("/settings")
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
        
        # If naming settings changed, we should ideally refresh planned paths.
        # For simplicity, we'll check if any 'naming_' key was in the update.
        if any(k.startswith(("naming_", "folder_", "extras_")) for k in settings.keys()):
            try:
                from app.formatter.formatter import Formatter, FormatterConfig
                from app.db.models import MediaItem, ItemStatus
                
                config = FormatterConfig.from_db(db)
                formatter = Formatter(config)
                
                # Get items in discovery
                items = db.query(MediaItem).filter(MediaItem.status.in_([
                    ItemStatus.NEW, ItemStatus.MATCHED, ItemStatus.UNCERTAIN,
                    ItemStatus.NO_MATCH, ItemStatus.MULTIPLE, ItemStatus.ERROR
                ])).all()
                
                for item in items:
                    # Find active match to format against
                    active_match = next((m for m in item.matches if m.is_active), None)
                    if active_match:
                        loc = next((l for l in active_match.localizations if l.is_primary), 
                                  active_match.localizations[0] if active_match.localizations else None)
                        if loc:
                            preview = formatter.format_item(item, active_match, loc)
                            if preview.target_subpath:
                                item.planned_path = f"{preview.target_subpath}/{preview.target_name}".replace("\\", "/")
                            else:
                                item.planned_path = preview.target_name
                db.commit()
            except Exception as e:
                print(f"Error refreshing planned paths: {e}")

        return {"status": "success"}
    finally:
        db.close()


@router.post("/database/clear")
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


