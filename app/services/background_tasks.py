import threading
import time
from app.db.base import Session as DbSession
from app.scanner.image_worker import ImageWorker
from app.utils.logger import logger

_image_worker_thread = None
_stop_event = threading.Event()

def run_image_worker_loop():
    logger.info("Global Background ImageWorker loop starting...")
    while not _stop_event.is_set():
        local_db = DbSession()
        try:
            iw = ImageWorker(local_db, "./data")
            iw.process_all()
        except Exception as e:
            logger.error(f"Global ImageWorker loop error: {e}")
        finally:
            local_db.close()
            DbSession.remove()
        
        # Sleep in small increments to allow fast shutdown
        for _ in range(10):
            if _stop_event.is_set():
                break
            time.sleep(0.5)
            
    logger.info("Global Background ImageWorker loop stopped.")

def start_background_workers():
    global _image_worker_thread
    if _image_worker_thread is None or not _image_worker_thread.is_alive():
        _stop_event.clear()
        _image_worker_thread = threading.Thread(target=run_image_worker_loop, daemon=True)
        _image_worker_thread.start()

def stop_background_workers():
    _stop_event.set()
    if _image_worker_thread:
        _image_worker_thread.join(timeout=5)
