import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.db.models import MediaMatch, MediaPersonLink, MediaItem, ItemType, Person, PersonLocalization

db = Session()
try:
    # Find active TV matches
    tv_matches = db.query(MediaMatch).join(MediaItem).filter(
        MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE]),
        MediaMatch.is_active == True
    ).group_by(MediaMatch.tmdb_id).all()
    
    print(f"Checking actor counts for unique series:")
    for m in tv_matches:
        # Get count of linked actors
        actor_count = db.query(MediaPersonLink).filter(
            MediaPersonLink.media_match_id == m.id,
            MediaPersonLink.job == "Actor"
        ).count()
        
        # Get count of linked creators/directors
        crew_count = db.query(MediaPersonLink).filter(
            MediaPersonLink.media_match_id == m.id,
            MediaPersonLink.job != "Actor"
        ).count()
        
        # Get series title (using localization if available)
        series_title = "Unknown Series"
        if m.localizations:
            series_title = m.localizations[0].series_title or m.localizations[0].title
            
        print(f"Series TMDB ID {m.tmdb_id} ({series_title}):")
        print(f"  Actors: {actor_count}")
        print(f"  Creators/Directors: {crew_count}")
        
        # List the top 10 actors
        links = db.query(MediaPersonLink).filter(
            MediaPersonLink.media_match_id == m.id,
            MediaPersonLink.job == "Actor"
        ).order_by(MediaPersonLink.order).all()
        for idx, l in enumerate(links):
            person = db.query(Person).filter(Person.id == l.person_id).first()
            name = person.localizations[0].name if person and person.localizations else "Unknown"
            print(f"    {idx+1}. {name} as {l.character_name}")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
