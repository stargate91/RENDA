import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.api.tmdb_client import TMDBClient

db = Session()
try:
    client = TMDBClient(db)
    endpoint = "/tv/4629"
    params = {
        "api_key": client._api_key,
        "language": "en-US",
        "append_to_response": "aggregate_credits"
    }
    data = client._call_api(endpoint, params)
    
    agg_credits = data.get("aggregate_credits", {})
    cast = agg_credits.get("cast", [])
    crew = agg_credits.get("crew", [])
    print("Can append aggregate_credits to response?")
    print(f"  Total cast returned: {len(cast)}")
    print(f"  Total crew returned: {len(crew)}")
    
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
