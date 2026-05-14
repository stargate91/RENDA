from app.db.models import MediaItem, MediaMatch, MetadataLocalization
from app.db.base import Session as DbSession
import json

db = DbSession()
try:
    # Check how many images are missing local paths
    locs = db.query(MetadataLocalization).all()
    total = len(locs)
    missing_poster = db.query(MetadataLocalization).filter(MetadataLocalization.poster_path != None, MetadataLocalization.local_poster_path == None).count()
    missing_stills = db.query(MetadataLocalization).filter(MetadataLocalization.still_path != None, MetadataLocalization.local_still_path == None).count()
    
    print(f"Total Localizations: {total}")
    print(f"Missing Local Posters: {missing_poster}")
    print(f"Missing Local Stills: {missing_stills}")
    
    # Check for any active background tasks if we had a task table (we don't)
    
finally:
    db.close()
