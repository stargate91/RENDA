import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.routes.people import get_person_detail
import json

try:
    response = get_person_detail(26087)
    print(f"Status Code: {response.status_code}")
    
    body = json.loads(response.body.decode('utf-8'))
    print(f"Name: {body.get('name')}")
    print(f"Number of series: {len(body.get('series', []))}")
    
    # Find Stargate SG-1 in the series list
    stargate_sg1 = None
    for s in body.get('series', []):
        if s.get('id') == 4629 or s.get('title') == "Stargate SG-1":
            stargate_sg1 = s
            break
            
    if stargate_sg1:
        print("\nStargate SG-1 Series Credit:")
        print(f"  ID (TMDB ID): {stargate_sg1.get('id')}")
        print(f"  Title: {stargate_sg1.get('title')}")
        print(f"  In Library: {stargate_sg1.get('in_library')}")
        print(f"  Library Series TMDB ID: {stargate_sg1.get('library_series_tmdb_id')}")
        print(f"  Job/Role: {stargate_sg1.get('job')}")
    else:
        print("\nStargate SG-1 not found in Amanda Tapping's credits.")
        print("First 5 series credits:")
        for s in body.get('series', [])[:5]:
            print(f"  - ID: {s.get('id')}, Title: {s.get('title')}, In Library: {s.get('in_library')}")
            
except Exception as e:
    import traceback
    traceback.print_exc()
