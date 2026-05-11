import os

with open('app/api/main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_lines(start, end):
    return "".join(lines[start-1:end]).replace("@app.", "@router.")

def write_router(filename, imports, content):
    full_content = f"""from fastapi import APIRouter
from app.db.base import Session
from app.db.models import *

router = APIRouter()

{imports}

{content}
"""
    with open(f'app/api/routes/{filename}', 'w', encoding='utf-8') as f:
        f.write(full_content)

# 1. Scanner Router
scanner_imports = """from pydantic import BaseModel
from typing import List
from fastapi import BackgroundTasks
from app.scanner.scanner_manager import ScannerManager, scan_status

class ScanRequest(BaseModel):
    paths: List[str]"""
scanner_content = get_lines(31, 35) + "\n" + get_lines(77, 104) + "\n" + get_lines(504, 517)
write_router('scanner.py', scanner_imports, scanner_content)

# 2. Settings Router
settings_content = get_lines(36, 44) + "\n" + get_lines(45, 60) + "\n" + get_lines(61, 76)
write_router('settings.py', '', settings_content)

# 3. Media Router
media_imports = """from sqlalchemy import func
from sqlalchemy.orm import joinedload
from fastapi.responses import JSONResponse
import os
import logging
logger = logging.getLogger(__name__)"""
media_content = get_lines(105, 162) + "\n" + get_lines(163, 341)
write_router('media.py', media_imports, media_content)

# 4. Metadata Router
metadata_imports = """from sqlalchemy.orm import joinedload
from fastapi.responses import JSONResponse
import logging
logger = logging.getLogger(__name__)"""
metadata_content = get_lines(342, 503)
write_router('metadata.py', metadata_imports, metadata_content)

# Update main.py
main_content = """from fastapi import FastAPI
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
"""
with open('app/api/main.py', 'w', encoding='utf-8') as f:
    f.write(main_content)

# Create __init__.py
with open('app/api/routes/__init__.py', 'w', encoding='utf-8') as f:
    f.write("# Routes package")

print("Backend router modularization complete.")
