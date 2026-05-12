"""Call the actual discovery route function directly to see what it returns."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# Suppress noisy logs
import logging
logging.basicConfig(level=logging.WARNING)

from app.api.routes.media import get_discovery_items
import json

result = get_discovery_items()

# result is a JSONResponse - extract the body
body = json.loads(result.body.decode())

movies = body.get("movies", [])
print(f"Total movies from route: {len(movies)}")

for m in movies[:5]:
    pp = m.get("planned_path", "")
    has_collection = "Collection" in pp if pp else False
    print(f"  ID={m['id']} | has_coll_in_path={has_collection} | planned_path='{pp}'")
