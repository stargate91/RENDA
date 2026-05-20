import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.api.tmdb_client import TMDBClient

db = Session()
try:
    client = TMDBClient(db)
    # Let's call the TMDB API directly for aggregate_credits
    endpoint = "/tv/4629/aggregate_credits"
    params = {"api_key": client._api_key, "language": "en-US"}
    data = client._call_api(endpoint, params)
    
    cast = data.get("cast", [])
    crew = data.get("crew", [])
    print(f"Stargate SG-1 Aggregate Credits:")
    print(f"  Total cast: {len(cast)}")
    print(f"  Total crew: {len(crew)}")
    
    print("\nFirst 15 aggregate cast members:")
    for i, c in enumerate(cast[:15]):
        roles = c.get("roles", [])
        role_names = ", ".join(r.get("character", "") for r in roles)
        print(f"  {i+1}. Name: {c.get('name')} (ID: {c.get('id')}), Roles: {role_names}, Episode Count: {c.get('total_episode_count')}, Order: {c.get('order')}")
        
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
