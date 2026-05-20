import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.db.models import Person, MediaPersonLink, MediaMatch, PersonLocalization

db = Session()
try:
    links = db.query(MediaPersonLink).filter(MediaPersonLink.media_match_id == 292).all()
    print(f"Actors/Crew linked to match 292:")
    for l in links:
        person = db.query(Person).filter(Person.id == l.person_id).first()
        loc = person.localizations[0] if person and person.localizations else None
        name = loc.name if loc else "Unknown"
        print(f"  Person ID: {l.person_id}, Name: {name}, Job: {l.job}")
        
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
