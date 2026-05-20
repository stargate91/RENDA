import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# UTF-8 kimenet Windows-on
if sys.platform == "win32":
    import io; sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from unittest.mock import patch
from app.db.models import Base, MediaMatch, MetadataLocalization, Person, ImageStatus, ItemType
from app.scanner.image_worker import ImageWorker

def run_image_test():
    # 1. Ideiglenes adatbázis létrehozása a teszthez
    test_db_path = "data/test_renda.db"
    if os.path.exists(test_db_path): 
        try:
            os.remove(test_db_path)
        except:
            pass
    engine = create_engine(f"sqlite:///{test_db_path}")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # 2. Teszt adatok betöltése
    print("Teszt adatok létrehozása...")
    
    # Film (The Matrix)
    m1 = MediaMatch(tmdb_id=603, item_type=ItemType.MOVIE, image_status=ImageStatus.PENDING)
    db.add(m1)
    db.flush()
    loc1 = MetadataLocalization(
        match_id=m1.id, 
        target_language="en", 
        title="The Matrix",
        poster_path="/yEFCKWpWTH3r5ZeJAwTjxfGhdMd.jpg",
        backdrop_path="/lh50BpiR9pt9nnb6uY6G9YSafeM.jpg"
    )
    db.add(loc1)

    # Epizód Still (The Last of Us S01E01)
    m2 = MediaMatch(tmdb_id=100001, item_type=ItemType.EPISODE, image_status=ImageStatus.PENDING)
    db.add(m2)
    db.flush()
    loc2 = MetadataLocalization(
        match_id=m2.id,
        target_language="en",
        title="When You're Lost in the Darkness",
        still_path="/aRquEWm8wWF1dfa9uZ1TXLvVrKD.jpg"
    )
    db.add(loc2)

    # Személy (Keanu Reeves)
    p1 = Person(
        id=6384, 
        profile_path="/kEoUZKEG7dzbCESDjd0CKAN1r0n.jpg", 
        image_status=ImageStatus.PENDING
    )
    db.add(p1)
    db.commit()

    # 3. ImageWorker indítása
    storage = Path("./test_media").absolute()
    print(f"Letöltés indítása ide: {storage}")
    with patch("app.db.base.Session", Session):
        worker = ImageWorker(db, str(storage))
        
        print("\nFeldolgozás indítása...")
        worker.process_all()

    # 4. Eredmények ellenőrzése
    print("\n=== EREDMÉNYEK ===\n")
    
    db.refresh(m1)
    db.refresh(m2)
    db.refresh(p1)
    
    print(f"Matrix Status: {m1.image_status.value}")
    print(f"  Poster: {loc1.local_poster_path}")
    print(f"  Backdrop: {loc1.local_backdrop_path}")
    
    print(f"\nEpisode Status: {m2.image_status.value}")
    print(f"  Still: {loc2.local_still_path}")
    
    print(f"\nKeanu Status: {p1.image_status.value}")
    print(f"  Profile: {p1.local_profile_path}")

    # Ellenőrizzük a fájlokat is
    for path in [loc1.local_poster_path, loc2.local_still_path, p1.local_profile_path]:
        if path and Path(path).exists():
            print(f"OK: Fájl létezik: {Path(path).name}")
        else:
            print(f"HIBA: Fájl nem található: {path}")

    db.close()
    engine.dispose()
    try:
        os.remove(test_db_path)
    except:
        pass

if __name__ == "__main__":
    run_image_test()
