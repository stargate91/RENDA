from fastapi import APIRouter
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import joinedload
from sqlalchemy import or_, func
import logging
import os
import threading
import subprocess
import platform
from pathlib import Path
from typing import Optional

from app.db.base import Session
from app.db.models import *

logger = logging.getLogger(__name__)
router = APIRouter()


def get_trailer(trailer_key: str):
    """
    Stream a locally cached trailer. If not yet downloaded, returns 202 with status.
    If ready, returns the video file for direct <video> playback.
    """
    from app.services.trailer_service import get_trailer_path, is_downloading

    path = get_trailer_path(trailer_key)
    if path:
        return FileResponse(
            path=str(path),
            media_type="video/mp4",
            filename=f"{trailer_key}.mp4"
        )
    
    if is_downloading(trailer_key):
        return JSONResponse(
            status_code=202,
            content={"status": "downloading", "message": "Trailer is being downloaded..."}
        )
    
    return JSONResponse(
        status_code=404,
        content={"status": "not_found", "message": "Trailer not cached. Call POST /api/trailer/{key} to start download."}
    )

def check_trailer_status(trailer_key: str):
    """
    Lightweight status check for a trailer to see if it is cached, downloading, or not found.
    Used by the frontend polling mechanism to avoid downloading the video file.
    """
    from app.services.trailer_service import get_trailer_path, is_downloading
    
    path = get_trailer_path(trailer_key)
    if path:
        return {"status": "ready"}
    if is_downloading(trailer_key):
        return {"status": "downloading"}
    return {"status": "not_found"}

def request_trailer_download(trailer_key: str):
    """
    Trigger an on-demand trailer download via yt-dlp.
    Returns immediately; the download happens in a background thread.
    """
    from app.services.trailer_service import get_trailer_path, download_trailer, is_downloading

    # Already downloaded?
    path = get_trailer_path(trailer_key)
    if path:
        return {"status": "ready", "url": f"/api/trailer/{trailer_key}"}
    
    # Already downloading?
    if is_downloading(trailer_key):
        return JSONResponse(
            status_code=202,
            content={"status": "downloading", "message": "Download already in progress."}
        )
    
    # Start background download
    def _bg_download():
        download_trailer(trailer_key)
    
    thread = threading.Thread(target=_bg_download, daemon=True)
    thread.start()
    
    return JSONResponse(
        status_code=202,
        content={"status": "downloading", "message": "Trailer download started."}
    )

def reveal_in_explorer(payload: dict):
    """Opens the file's parent folder and selects the file in the OS file explorer."""
    path = payload.get("path")
    if not path or not os.path.exists(path):
        return {"status": "error", "message": f"Path does not exist: {path}"}
    
    path = os.path.abspath(path)
    try:
        if platform.system() == "Windows":
            # /select highlights the file and usually brings explorer to front
            subprocess.Popen(f'explorer /select,"{os.path.normpath(path)}"')
        elif platform.system() == "Darwin":
            # -R reveals the file in Finder
            subprocess.run(["open", "-R", path])
        else:
            # For Linux, we still just open the folder as xdg-open doesn't have a universal select
            folder = os.path.dirname(path)
            subprocess.run(["xdg-open", folder])
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Reveal failed: {e}")
        return {"status": "error", "message": str(e)}

def find_media_player():
    """
    Looks for VLC or MPC-HC in standard paths on Windows.
    Returns (player_path, player_type) or (None, None).
    """
    if platform.system() != "Windows":
        return None, None
        
    vlc_paths = [
        r"C:\Program Files\VideoLAN\VLC\vlc.exe",
        r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe"
    ]
    for p in vlc_paths:
        if os.path.exists(p):
            return p, "vlc"
            
    mpc_paths = [
        r"C:\Program Files\MPC-HC\mpc-hc64.exe",
        r"C:\Program Files (x86)\MPC-HC\mpc-hc.exe"
    ]
    for p in mpc_paths:
        if os.path.exists(p):
            return p, "mpc"
            
    return None, None

def monitor_playback(item_id: int, player_type: str, proc: subprocess.Popen, port: int):
    """
    Background worker thread to monitor external media player.
    Saves last watched date, play count, resume position, and marks watched.
    """
    import time
    import requests
    import re
    from app.db.base import Session
    from app.db.models import MediaItem
    
    logger.info(f"Started playback monitoring thread for item_id={item_id}, player={player_type}, port={port}")
    
    last_saved_time = 0
    total_length = 0
    current_time = 0
    
    # Wait a moment for the player to initialize
    time.sleep(3)
    
    try:
        while proc.poll() is None:
            time.sleep(2)
            try:
                if player_type == "vlc":
                    r = requests.get(
                        f"http://localhost:{port}/requests/status.json", 
                        auth=("", "renda"), 
                        timeout=1.5
                    )
                    if r.status_code == 200:
                        data = r.json()
                        current_time = int(data.get("time", 0))
                        total_length = int(data.get("length", 0))
                elif player_type == "mpc":
                    r = requests.get(
                        f"http://localhost:{port}/variables.html", 
                        timeout=1.5
                    )
                    if r.status_code == 200:
                        pos_match = re.search(r'id="position">(\d+)</p>', r.text)
                        dur_match = re.search(r'id="duration">(\d+)</p>', r.text)
                        if pos_match:
                            current_time = int(pos_match.group(1)) // 1000
                        if dur_match:
                            total_length = int(dur_match.group(1)) // 1000
                
                # If position changed and is significantly different, update db periodically
                if current_time > 0 and abs(current_time - last_saved_time) >= 10:
                    last_saved_time = current_time
                    db = Session()
                    try:
                        item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
                        if item:
                            item.resume_position = current_time
                            
                            # If watched over 90% of the video, mark as watched/completed and reset resume
                            if total_length > 0:
                                progress = current_time / total_length
                                if progress > 0.90:
                                    item.is_watched = True
                                    item.resume_position = 0
                            
                            db.commit()
                    except Exception as ex:
                        db.rollback()
                        logger.error(f"Failed to update playback position in thread: {ex}")
                    finally:
                        db.close()
                        
            except Exception as e:
                # Debug logging only to avoid visual clutter
                logger.debug(f"Playback polling request failed: {e}")
                
    except Exception as e:
        logger.error(f"Error in playback monitoring thread: {e}")
    finally:
        logger.info(f"Playback monitoring thread finished for item_id={item_id}")

def play_media_item(payload: dict):
    """Launches the media file locally using the OS default associated media player."""
    item_id = payload.get("item_id")
    if not item_id:
        return JSONResponse(status_code=400, content={"error": "item_id is required"})
        
    db = Session()
    try:
        from app.db.models import MediaItem, PlaybackLog
        from datetime import datetime
        import os
        import platform
        import subprocess
        import threading
        
        item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Media item not found"})
            
        file_path = item.current_path
        if not file_path or not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"Media file not found at: {file_path}"})
            
        logger.info(f"Launching media file with hybrid tracking: {file_path}")
        
        # 1. Update general stats immediately
        item.watch_count += 1
        item.last_watched_at = datetime.utcnow()
        
        # Create a new PlaybackLog entry
        log_entry = PlaybackLog(media_item_id=item.id, watched_at=datetime.utcnow())
        db.add(log_entry)
        db.commit()
        
        start_seconds = item.resume_position or 0
        
        # 2. Try to find VLC or MPC-HC for precision tracking
        player_path, player_type = find_media_player()
        
        if player_path and player_type:
            proc = None
            port = 8080 if player_type == "vlc" else 13579
            
            if player_type == "vlc":
                args = [player_path, os.path.normpath(file_path)]
                if start_seconds > 10:
                    args.append(f"--start-time={start_seconds}")
                args.extend(["--extraintf=http", "--http-password=renda", f"--http-port={port}"])
                proc = subprocess.Popen(args)
            elif player_type == "mpc":
                args = [player_path, os.path.normpath(file_path)]
                if start_seconds > 10:
                    h = start_seconds // 3600
                    m = (start_seconds % 3600) // 60
                    s = start_seconds % 60
                    args.extend(["/startpos", f"{h:02d}:{m:02d}:{s:02d}"])
                proc = subprocess.Popen(args)
                
            if proc:
                # Launch background daemon thread to poll playback progress
                t = threading.Thread(
                    target=monitor_playback, 
                    args=(item.id, player_type, proc, port),
                    daemon=True
                )
                t.start()
                return {
                    "status": "success", 
                    "message": f"Launched {player_type.upper()} with precision hybrid tracking for {file_path}"
                }
                
        # 3. Fallback to default OS launch if VLC/MPC not installed or failed to launch
        logger.info(f"VLC or MPC-HC not found. Falling back to default OS player for: {file_path}")
        if platform.system() == "Windows":
            os.startfile(os.path.normpath(file_path))
        elif platform.system() == "Darwin": # macOS
            subprocess.run(["open", file_path])
        else: # Linux
            subprocess.run(["xdg-open", file_path])
            
        return {"status": "success", "message": f"Launched default player (no position tracking) for {file_path}"}
        
    except Exception as e:
        logger.error(f"Failed to play media file: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

def reset_item_progress(item_id: int):
    """Manually resets the playback progress of an item to 0 and removes the watched flag."""
    db = Session()
    try:
        from app.db.models import MediaItem
        item = db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item:
            return JSONResponse(status_code=404, content={"error": "Item not found"})
        
        item.resume_position = 0
        item.is_watched = False
        # Do not modify last_watched_at so it remains in history, but we could if needed.
        
        db.commit()
        return {"status": "success", "resume_position": 0, "is_watched": False}
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error resetting progress: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()
