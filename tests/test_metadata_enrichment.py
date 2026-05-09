import os
import sys
from sqlalchemy.orm import Session
from app.db.base import SessionLocal, engine, Base
from app.db.models import UserSetting, MediaItem, MediaMatch, ItemType, ItemStatus, MetadataLocalization, Person, MediaPersonLink
from app.scanner.metadata_enricher import MetadataEnricher
from app.resolver.resolver import Resolver

# Windows konzol fix
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def setup_db():
    if os.path.exists("renda.db"): os.remove("renda.db")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.add(UserSetting(key="tmdb_api_key", value="f1065eab900ebbda0e3d09f948d581e0"))
    db.add(UserSetting(key="omdb_api_key", value="1da6f98c"))
    db.commit()
    return db

def run_tv_test(db, resolver, enricher, filename, title, season, episode, itype, desc):
    print(f"\n>>> {desc} <<<")
    path = f"E:/Tests/{filename}"
    item = MediaItem(
        original_path=path, current_path=path, filename=filename,
        extension=".mkv" if "." in filename else "", folder_name="Tests", size=1024,
        item_type=ItemType.MOVIE,
        fn_title=title, fn_season=season, fn_episode=episode, fn_item_type=itype
    )
    db.add(item)
    db.flush()

    resolver.resolve_item(item, language="hu")
    active = db.query(MediaMatch).filter(MediaMatch.media_item_id == item.id).first()
    if active: active.is_active = True
    db.commit()
    
    enricher.enrich_matched_item(item, language="hu")
    
    # Eredmények ellenőrzése
    loc = db.query(MetadataLocalization).filter(MetadataLocalization.match_id == active.id).first()
    
    print(f"  Típus: {active.item_type.value}")
    print(f"  Sorozat: {loc.series_title}")
    if loc.season_title: print(f"  Szezon:  {loc.season_title}")
    if loc.episode_title: print(f"  Epizód:  {loc.episode_title}")
    
    print(f"  Értékelések:")
    print(f"    - TMDB: {active.rating_tmdb} (Series szintű ha epizódnál nincs)")
    print(f"    - IMDb: {active.rating_imdb}")
    
    print(f"  Leírás eleje: {loc.overview[:100]}...")

def test_hierarchy():
    db = setup_db()
    resolver = Resolver(db)
    enricher = MetadataEnricher(db)

    print("\n=== TV SOROZAT HIERARCHIA ÉS ÉRTÉKELÉS TESZT ===\n")

    # 1. CSAK SOROZAT (Pl. egy mappa azonosítása)
    run_tv_test(db, resolver, enricher, "The Last of Us", "The Last of Us", None, None, "series", "1. TESZT: CSAK SOROZAT SZINT")

    # 2. KONKRÉT EPIZÓD
    run_tv_test(db, resolver, enricher, "The.Last.of.Us.S01E03.mkv", "The Last of Us", 1, "3", "episode", "2. TESZT: EPIZÓD SZINT (S01E03)")

    db.close()

if __name__ == "__main__":
    test_hierarchy()
