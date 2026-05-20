from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.base import Session, Base, engine, CacheBase, cache_engine
from app.db.models import *

# Import routers
from app.api.routes import scanner, settings, library, recommendations, people, playback, overrides, metadata, renamer, tags, lists

import os

# Automatically create tables if they don't exist
Base.metadata.create_all(bind=engine)
CacheBase.metadata.create_all(bind=cache_engine)



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

# Ensure media directory exists
os.makedirs("data/media", exist_ok=True)

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
app.include_router(library.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(people.router, prefix="/api")
app.include_router(playback.router, prefix="/api")
app.include_router(overrides.router, prefix="/api")
app.include_router(metadata.router, prefix="/api")
app.include_router(renamer.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(lists.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
