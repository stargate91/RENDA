from app.db.base import Session
from app.api.tmdb_client import TMDBClient

db = Session()
try:
    client = TMDBClient(db)
    print(f"Testing search for 'Godzilla' (movie)...")
    results = client.search("Godzilla", item_type="movie")
    print(f"Found {len(results)} results")
    for r in results[:3]:
        print(f"- {r.get('title')} ({r.get('release_date')})")
    
    print(f"\nTesting search for 'Stargate' (tv)...")
    results = client.search("Stargate", item_type="tv")
    print(f"Found {len(results)} results")
    for r in results[:3]:
        print(f"- {r.get('name')} ({r.get('first_air_date')})")
finally:
    db.close()
