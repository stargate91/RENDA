from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.base import Session, Base, engine, CacheBase, cache_engine
from app.db.models import *

# Import routers
from app.api.routes import scanner, settings, media, metadata, renamer, tags, lists

# Automatically create tables if they don't exist
Base.metadata.create_all(bind=engine)
CacheBase.metadata.create_all(bind=cache_engine)

# Run schema migrations for Person table if needed
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("persons")]
    with engine.begin() as conn:
        if "is_active" not in columns:
            conn.execute(text("ALTER TABLE persons ADD COLUMN is_active INTEGER DEFAULT 0"))
            print("Added is_active column to persons table")
        if "is_favorite" not in columns:
            conn.execute(text("ALTER TABLE persons ADD COLUMN is_favorite INTEGER DEFAULT 0"))
            print("Added is_favorite column to persons table")
        if "user_rating" not in columns:
            conn.execute(text("ALTER TABLE persons ADD COLUMN user_rating INTEGER DEFAULT NULL"))
            print("Added user_rating column to persons table")
        if "custom_tags" not in columns:
            conn.execute(text("ALTER TABLE persons ADD COLUMN custom_tags TEXT DEFAULT NULL"))
            print("Added custom_tags column to persons table")
            
        # Migrations for media_items table
        media_columns = [c["name"] for c in inspector.get_columns("media_items")]
        if "is_favorite" not in media_columns:
            conn.execute(text("ALTER TABLE media_items ADD COLUMN is_favorite INTEGER DEFAULT 0"))
            print("Added is_favorite column to media_items table")
        if "user_rating" not in media_columns:
            conn.execute(text("ALTER TABLE media_items ADD COLUMN user_rating INTEGER DEFAULT NULL"))
            print("Added user_rating column to media_items table")

        if "last_watched_at" not in media_columns:
            conn.execute(text("ALTER TABLE media_items ADD COLUMN last_watched_at TIMESTAMP DEFAULT NULL"))
            print("Added last_watched_at column to media_items table")
        if "resume_position" not in media_columns:
            conn.execute(text("ALTER TABLE media_items ADD COLUMN resume_position INTEGER DEFAULT 0"))
            print("Added resume_position column to media_items table")
        if "watch_count" not in media_columns:
            conn.execute(text("ALTER TABLE media_items ADD COLUMN watch_count INTEGER DEFAULT 0"))
            print("Added watch_count column to media_items table")
        if "is_watched" not in media_columns:
            conn.execute(text("ALTER TABLE media_items ADD COLUMN is_watched INTEGER DEFAULT 0"))
            print("Added is_watched column to media_items table")
            
        # Migrations for metadata_localizations table
        loc_columns = [c["name"] for c in inspector.get_columns("metadata_localizations")]
        if "trailer_url" not in loc_columns:
            conn.execute(text("ALTER TABLE metadata_localizations ADD COLUMN trailer_url TEXT DEFAULT NULL"))
            print("Added trailer_url column to metadata_localizations table")
            
        # Tags migration
        tables = inspector.get_table_names()
        if "tags" not in tables:
            print("Creating tags tables and migrating old custom_tags...")
            from app.db.models.media import Tag, media_item_tags, MediaItem
            from app.db.base import Base
            # Create the tables
            Tag.__table__.create(engine)
            media_item_tags.create(engine)
            
            # Migrate old JSON tags
            from sqlalchemy.orm import Session
            import json
            db = Session(engine)
            try:
                items = db.query(MediaItem).filter(MediaItem.custom_tags.isnot(None)).all()
                tag_cache = {}
                for item in items:
                    try:
                        tags_list = item.custom_tags
                        if isinstance(tags_list, str):
                            tags_list = json.loads(tags_list)
                            
                        if not isinstance(tags_list, list):
                            continue
                            
                        for t_name in tags_list:
                            t_name = str(t_name).strip()
                            if not t_name: continue
                            
                            if t_name not in tag_cache:
                                new_tag = Tag(name=t_name)
                                db.add(new_tag)
                                db.commit()
                                tag_cache[t_name] = new_tag
                                
                            item.tags.append(tag_cache[t_name])
                    except Exception as json_e:
                        print(f"Failed to migrate tags for item {item.id}: {json_e}")
                db.commit()
                print("Tags migration complete.")
            except Exception as e:
                print(f"Error migrating tags data: {e}")
            finally:
                db.close()

except Exception as e:
    import logging
    logging.getLogger(__name__).error(f"Failed to migrate database: {e}")

from contextlib import asynccontextmanager
from app.services.background_tasks import start_background_workers, stop_background_workers

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.scanner.image_worker import ImageWorker
    from app.db.base import Session
    db = Session()
    try:
        ImageWorker.reset_stale_tasks(db)
    finally:
        db.close()
        
    # Start background workers (e.g. ImageWorker)
    start_background_workers()
    yield
    # Stop them gracefully
    stop_background_workers()

app = FastAPI(title="RENDA API", lifespan=lifespan)

# Mount media folder
app.mount("/media", StaticFiles(directory="data/media"), name="media")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(scanner.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(metadata.router, prefix="/api")
app.include_router(renamer.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(lists.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
