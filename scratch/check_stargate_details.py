import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.db.models import TMDBCache
from app.api.tmdb_client import TMDBClient

db = Session()
try:
    client = TMDBClient(db)
    details = client.get_details(4629, "tv")
    print(f"Stargate SG-1 Details from TMDB API:")
    print(f"  Name: {details.get('name')}")
    
    credits = details.get("credits", {})
    cast = credits.get("cast", [])
    crew = credits.get("crew", [])
    print(f"  Total cast returned by TMDB: {len(cast)}")
    print(f"  Total crew returned by TMDB: {len(crew)}")
    
    print("\nFirst 15 cast members from TMDB:")
    for i, c in enumerate(cast[:15]):
        print(f"  {i+1}. Name: {c.get('name')}, Character: {c.get('character')}, Popularity: {c.get('popularity')}, Order: {c.get('order')}")
        
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
