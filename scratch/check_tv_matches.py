import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.db.models import MediaItem, MediaMatch, ItemType, ItemStatus

db = Session()
try:
    tv_items = db.query(MediaItem).filter(MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE])).all()
    print(f"Total TV items: {len(tv_items)}")
    
    tv_matches = db.query(MediaMatch).join(MediaItem).filter(
        MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE])
    ).all()
    print(f"Total TV matches: {len(tv_matches)}")
    
    active_tv_matches = db.query(MediaMatch).join(MediaItem).filter(
        MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE]),
        MediaMatch.is_active == True
    ).all()
    print(f"Active TV matches: {len(active_tv_matches)}")
    for m in active_tv_matches[:10]:
        print(f"  Match ID: {m.id}, TMDB ID: {m.tmdb_id}, Series TMDB ID: {m.series_tmdb_id}, Title: {m.media_item.fn_title}")
        
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
