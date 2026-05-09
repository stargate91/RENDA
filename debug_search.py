from app.db.base import SessionLocal
from app.resolver.resolver import Resolver

db = SessionLocal()
resolver = Resolver(db)

for q in ["Apollo 11", "28 Weeks Later"]:
    for lang in ["en", "hu"]:
        print(f"\n--- KERESÉS: {q} (Lang: {lang}) ---")
        results = resolver.api.search(q, item_type="movie", language=lang)
        print(f"Találatok száma: {len(results)}")
        for r in results:
            try:
                title = r.get('title', '???')
                date = r.get('release_date', '???')
                print(f" - {r['id']}: {title} ({date})")
            except:
                print(f" - {r['id']}: [Encoding Error]")
