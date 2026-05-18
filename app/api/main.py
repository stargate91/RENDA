from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.base import Session, Base, engine, CacheBase, cache_engine
from app.db.models import *

# Import routers
from app.api.routes import scanner, settings, media, metadata, renamer

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
        if "custom_tags" not in media_columns:
            conn.execute(text("ALTER TABLE media_items ADD COLUMN custom_tags TEXT DEFAULT NULL"))
            print("Added custom_tags column to media_items table")
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
