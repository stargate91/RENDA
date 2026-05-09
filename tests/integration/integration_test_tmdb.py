import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.db.base import SessionLocal, engine, Base
from app.db.models import UserSetting, MediaItem, ItemType, ItemStatus
from app.resolver.resolver import Resolver
from app.scanner.analyzer import Analyzer
from datetime import datetime

# Windows konzol kódolás javítása (UTF-8)
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def setup_api_key(db: Session, key: str):
    setting = db.query(UserSetting).filter(UserSetting.key == "tmdb_api_key").first()
    if setting:
        setting.value = key
    else:
        setting = UserSetting(key="tmdb_api_key", value=key)
        db.add(setting)
    db.commit()

def reconstruct_title(guess, raw):
    title = guess.get('title')
    is_movie = guess.get('type') == 'movie'
    is_lonely_ep = guess.get('type') == 'episode' and not guess.get('season')
    if not title or not (is_movie or is_lonely_ep):
        return title
    ep = guess.get('episode')
    res = str(title)
    if ep:
        ep_str = str(ep)
        t_pos = raw.lower().find(title.lower())
        e_pos = raw.lower().find(ep_str)
        if e_pos < t_pos: res = f"{ep_str} {res}"
        else: res = f"{res} {ep_str}"
    if guess.get('part'):
        res = f"{res} {guess.get('part')}"
    return res

def run_final_boss_tests():
    if os.path.exists("renda.db"):
        os.remove("renda.db")
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    setup_api_key(db, "f1065eab900ebbda0e3d09f948d581e0")
    
    resolver = Resolver(db)
    analyzer = Analyzer()
    
    boss_items = [
        {"fn_title": "1917", "fn_year": 2019, "desc": "Cím egy évszám"},
        {"fn_title": "A.I. Artificial Intelligence", "fn_year": 2001, "desc": "Rövidítések"},
        {"fn_title": "Zack Snyder's Justice League", "fn_year": 2021, "desc": "Speciális kiadás"},
        {"fn_title": "Drive", "fn_year": 2011, "desc": "Gyakori cím"},
        {"fn_title": "Apollo 11", "fn_year": 2019, "desc": "Dokumentumfilm"},
        {"fn_title": "28 Weeks Later", "fn_year": 2007, "desc": "Hasonló folytatás"}
    ]

    print("\n=== FINAL BOSS: TMDB API KÍNVALLATÁS (FIXED PIPELINE) ===\n")

    for i, data in enumerate(boss_items):
        raw_name = f"{data['fn_title']}.mkv"
        guess = analyzer.analyze_text(raw_name)
        
        final_title = reconstruct_title(guess, raw_name)
        print(f"  [DEBUG] Raw: {raw_name} | GuessTitle: {guess.get('title')} | Final: {final_title}")
        
        # TÍPUS KORREKCIÓ (mint a valódi ScannerManagerben)
        final_type = guess.get('type') or data.get("fn_item_type")
        if final_type == 'episode' and not guess.get('season'):
            final_type = 'movie'
            
        path = f"E:/Movies/{raw_name}"
        item = MediaItem(
            original_path=path,
            current_path=path,
            filename=raw_name,
            extension=".mkv",
            folder_name="Movies",
            size=1024*1024,
            item_type=ItemType.MOVIE,
            status=ItemStatus.NEW,
            fn_title=final_title or data.get("fn_title"),
            fn_year=guess.get('year') or data.get("fn_year"),
            fn_item_type=final_type
        )
        db.add(item)
        db.flush()
        
        print(f"Keresés [{data['desc']}]: Fájlnév: '{raw_name}' -> Tisztított cím: '{item.fn_title}'")
        try:
            resolver.resolve_item(item, language="hu")
            print(f"  -> Eredmény: {item.status.value}")
            
            matches = item.matches
            print(f"  -> Találatok száma: {len(matches)}")
            for m in matches:
                loc = m.localizations[0] if m.localizations else None
                active_str = "[ACTIVE]" if m.is_active else ""
                year = m.release_date.year if m.release_date else (m.first_air_date.year if m.first_air_date else None)
                year_str = f"({year})" if year else ""
                print(f"     - {m.tmdb_id}: {loc.title if loc else '???'} {year_str} {active_str}")
        except Exception as e:
            print(f"  !! HIBA: {e}")
            
        print("-" * 40)

    db.commit()
    db.close()

if __name__ == "__main__":
    run_final_boss_tests()
