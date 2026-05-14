import requests
import json

try:
    response = requests.get("http://localhost:8000/discovery")
    if response.status_code == 200:
        data = response.json()
        extras = data.get("extras", [])
        print(f"Found {len(extras)} extras")
        for ex in extras:
            if "hot.chick" in ex.get('filename', '').lower():
                print(f"Extra ID: {ex.get('id')}")
                print(f"  Parent: {ex.get('parent_name')}")
                print(f"  Original: {ex.get('filename')}")
                print(f"  Planned: {ex.get('planned_path')}")
                print(f"  Category: {ex.get('category')}")
                print(f"  Subtype: {ex.get('subtype')}")
                print("-" * 20)
    else:
        print(f"Error: {response.status_code}")
except Exception as e:
    print(f"Request failed: {e}")
