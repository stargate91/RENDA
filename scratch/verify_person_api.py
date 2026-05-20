import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.db.models import Person, MediaPersonLink, MediaMatch, MediaItem

db = Session()
try:
    # 1. Let's find active people in the DB
    active_people = db.query(Person).filter(Person.is_active == True).limit(5).all()
    print(f"Found {len(active_people)} active people in database:")
    for p in active_people:
        print(f"  ID: {p.id}, Popularity: {p.popularity}")
        
    # 2. Let's find people linked to some library items
    links = db.query(MediaPersonLink).limit(5).all()
    print(f"\nFound {len(links)} media person links in database:")
    for l in links:
        print(f"  Person ID: {l.person_id}, Match ID: {l.media_match_id}, Job: {l.job}")
        
    if not links:
        print("\nNo links found, let's query first person from db...")
        person = db.query(Person).first()
    else:
        person = db.query(Person).filter(Person.id == links[0].person_id).first()
        
    if person:
        print(f"\nTesting get_person_detail for Person ID: {person.id}...")
        from app.api.routes.people import get_person_detail
        
        response = get_person_detail(person.id)
        print(f"Response status code: {response.status_code}")
        
        import json
        body = json.loads(response.body.decode('utf-8'))
        print(f"Response keys: {list(body.keys())}")
        print(f"Name: {body.get('name')}")
        print(f"Number of movies: {len(body.get('movies', []))}")
        print(f"Number of series: {len(body.get('series', []))}")
        
        # Print series details if any
        series_list = body.get('series', [])
        if series_list:
            print("\nSeries credits:")
            for s in series_list[:3]:
                print(f"  - Title: {s.get('title')}, In Library: {s.get('in_library')}, Series TMDB ID: {s.get('series_tmdb_id')}, Library Series TMDB ID: {s.get('library_series_tmdb_id')}")
    else:
        print("\nNo people found in database to test.")
        
except Exception as e:
    import traceback
    print("Error verifying person API:")
    traceback.print_exc()
finally:
    db.close()
