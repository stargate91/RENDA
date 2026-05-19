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
        
        # Update is_primary flags in database if language setting changed
        if "primary_metadata_language" in settings:
            target_lang = settings["primary_metadata_language"]
            db.query(MetadataLocalization).filter(MetadataLocalization.target_language == target_lang).update({"is_primary": True})
            db.query(MetadataLocalization).filter(MetadataLocalization.target_language != target_lang).update({"is_primary": False})
            db.commit()
        
        # If naming settings OR language settings changed, we should refresh planned paths.
        if any(k.startswith(("naming_", "folder_", "extras_")) for k in settings.keys()) or "primary_metadata_language" in settings:
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
                        # Fetch freshly committed is_primary localization
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
def clear_database(options: dict = None):
    """Wipes specific database sections based on options (except user_settings), preserving local images."""
    if not options:
        options = {"all": True}
        
    db = Session()
    try:
        from app.db.base import cache_engine
        import logging
        logger = logging.getLogger(__name__)

        if options.get("all"):
            # Clear everything except user_settings
            for table in reversed(Base.metadata.sorted_tables):
                if table.name != "user_settings":
                    db.execute(table.delete())
            # Clear cache database
            from app.db.base import CacheBase
            with cache_engine.begin() as conn:
                for table in reversed(CacheBase.metadata.sorted_tables):
                    conn.execute(table.delete())
        else:
            # 1. Scanned Files & Discovery
            if options.get("discovery"):
                from app.db.models.enums import ItemStatus
                from app.db.models import MediaItem
                disc_statuses = [
                    ItemStatus.NEW, ItemStatus.NO_MATCH, ItemStatus.UNCERTAIN, 
                    ItemStatus.MULTIPLE, ItemStatus.MATCHED, ItemStatus.ERROR
                ]
                db.query(MediaItem).filter(MediaItem.status.in_(disc_statuses)).delete(synchronize_session=False)

            # 2. Organized Library & Performers
            if options.get("library"):
                from app.db.models.enums import ItemStatus
                from app.db.models import MediaItem, Person, PersonLocalization, MediaPersonLink
                lib_statuses = [ItemStatus.ORGANIZED, ItemStatus.RENAMED]
                # Delete library media items
                db.query(MediaItem).filter(MediaItem.status.in_(lib_statuses)).delete(synchronize_session=False)
                # Delete all persons (actors / directors database)
                db.query(MediaPersonLink).delete(synchronize_session=False)
                db.query(PersonLocalization).delete(synchronize_session=False)
                db.query(Person).delete(synchronize_session=False)

            # 3. Metadata Cache
            if options.get("cache"):
                from app.db.base import CacheBase
                with cache_engine.begin() as conn:
                    for table in reversed(CacheBase.metadata.sorted_tables):
                        conn.execute(table.delete())

            # 4. Custom Tags
            if options.get("tags"):
                from app.db.models import Tag
                from app.db.models.person import Person
                # Delete all Tag entities from the tags table
                db.query(Tag).delete(synchronize_session=False)
                # Clear custom_tags on persons
                db.query(Person).update({Person.custom_tags: None}, synchronize_session=False)

            # 5. Operation History & logs
            if options.get("history"):
                from app.db.models.action import ActionBatch, ActionLog
                from app.db.models.media import PlaybackLog
                db.query(ActionLog).delete(synchronize_session=False)
                db.query(ActionBatch).delete(synchronize_session=False)
                db.query(PlaybackLog).delete(synchronize_session=False)

        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger(__name__).error(f"Database clear failed: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


