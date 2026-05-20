import logging
import sys
from app.db.base import Session
from app.scanner.scanner_manager import ScannerManager

logging.basicConfig(level=logging.INFO, stream=sys.stdout,
                    format='[%(asctime)s] [%(levelname)-8s] %(message)s')

db = Session()
try:
    path = "E:\\downloads_torrent\\media\\Movies\\Who Finds a Friend Finds a Treasure (1981) - 1080p"
    print(f"Starting test scan for path: {path}")
    scanner = ScannerManager(db, min_video_size_mb=50, min_video_duration_minutes=12)
    scanner.scan_and_save([path])
    print("Scan completed successfully.")
finally:
    db.close()
