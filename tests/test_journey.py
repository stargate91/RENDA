from app.db.base import SessionLocal
from app.resolver.resolver import Resolver
from app.db.models import MediaItem, ItemType

db = SessionLocal()
resolver = Resolver(db)

title = "Journey to the Center of the Earth Mini-Series"
sanitized = resolver._sanitize_query(title)

print(f"Eredeti: {title}")
print(f"Tisztított: {sanitized}")

# Keresés is
results = resolver.api.search(sanitized, item_type="tv")
print(f"Találatok (TV): {len(results)}")
for r in results:
    name = r.get("name") or r.get("title")
    year = (r.get("first_air_date") or r.get("release_date") or "???")[:4]
    print(f" - {r['id']}: {name} ({year})")
