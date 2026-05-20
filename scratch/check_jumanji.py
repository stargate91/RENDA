from app.db.base import Session
from app.db.models import MediaItem, ExtraFile

db = Session()
try:
    items = db.query(MediaItem).filter(MediaItem.original_path.like("%Finds%")).all()
    print(f"Found {len(items)} Who Finds a Friend items in DB:")
    for j in items:
        print(f"ID: {j.id} | Path: {j.original_path} | Size: {j.size} bytes | Duration: {j.duration} | Status: {j.status}")
finally:
    db.close()
