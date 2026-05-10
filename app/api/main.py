from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.base import Session, Base, engine
from app.db.models import *

# Import routers
from app.api.routes import scanner, settings, media, metadata

# Automatically create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RENDA API")

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
app.include_router(scanner.router)
app.include_router(settings.router)
app.include_router(media.router)
app.include_router(metadata.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
