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


