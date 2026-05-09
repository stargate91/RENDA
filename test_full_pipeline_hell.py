import os
import shutil
import time
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.base import engine, Base, Session as ScopedSession
from app.db.models import MediaItem, ItemStatus, ActionBatch, ActionLog, ActionStatus
from app.scanner.scanner_manager import ScannerManager
from app.renamer.renamer_engine import RenamerEngine
from app.formatter.formatter import Formatter
from app.utils.logger import logger

# TEST CONFIGURATION
TEST_ROOT = Path("pipeline_hell_test")
SOURCE_DIR = TEST_ROOT / "source"
DEST_DIR = TEST_ROOT / "destination"

def setup_hell_env():
    """Wipes and re-initializes the test environment."""
    if TEST_ROOT.exists():
        shutil.rmtree(TEST_ROOT)
    TEST_ROOT.mkdir()
    SOURCE_DIR.mkdir()
    DEST_DIR.mkdir()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def create_dirty_files():
    """Generates 'dirty' files representing various edge cases."""
    cases = [
        # 1. Extremely long path (Windows MAX_PATH boundary)
        SOURCE_DIR / ("A" * 150) / "Movie.2023.1080p.mkv",
        # 2. Unicode and Emojis
        SOURCE_DIR / "Film.🔥.2024.1080p.mkv",
        # 3. Illegal characters (to be stripped by the formatter)
        SOURCE_DIR / "Illegal: Char? [2024].mkv",
        # 4. Case-only rename scenario
        SOURCE_DIR / "case_test.mkv",
        # 5. Stable file for mtime/size change detection test
        SOURCE_DIR / "stable_file.mkv"
    ]
    
    for p in cases:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "wb") as f:
            f.write(os.urandom(1024 * 1024 * 5)) # 5MB dummy
    
    return cases

def run_hell_pipeline():
    """Executes the full pipeline test covering various failure scenarios."""
    setup_hell_env()
    dirty_files = create_dirty_files()
    
    db = ScopedSession()
    scanner = ScannerManager(db, min_video_size_mb=0)
    renamer = RenamerEngine(db)
    formatter = Formatter()

    # --- STEP 1: INITIAL SCAN ---
    logger.info(">>> STEP 1: STARTING INITIAL SCAN")
    scanner.scan_and_save([str(SOURCE_DIR)])
    
    items = db.query(MediaItem).all()
    logger.info(f"Scanned: {len(items)} items.")

    # --- STEP 2: MTIME-BASED RE-SCAN TEST ---
    logger.info(">>> STEP 2: MTIME TEST: Modifying a file...")
    stable_file = SOURCE_DIR / "stable_file.mkv"
    time.sleep(1.1) # Ensure mtime change
    with open(stable_file, "ab") as f:
        f.write(b"modified")
    
    # Run scanner again - should only re-enrich 1 file
    scanner.scan_and_save([str(SOURCE_DIR)])

    # --- STEP 3: MAX_PATH WARNING TEST ---
    logger.info(">>> STEP 3: MAX_PATH TEST")
    long_item = db.query(MediaItem).filter(MediaItem.filename.contains("A" * 100)).first()
    if long_item:
        # Plan a path that is intentionally too long
        very_long_dest = "D" * 200
        preview = formatter.plan_rename(long_item.matches[0], str(DEST_DIR / very_long_dest))
        if preview.warnings:
            logger.warning(f"Success: Warning detected: {preview.warnings[0]}")

    # --- STEP 4: ATOMIC ROLLBACK TEST ---
    logger.info(">>> STEP 4: ROLLBACK TEST: Simulating failure...")
    test_item = db.query(MediaItem).filter(MediaItem.filename == "case_test.mkv").first()
    
    if test_item:
        batch = ActionBatch(name="Rollback Test")
        db.add(batch)
        db.commit()

        from app.formatter.formatter import RenamePreview
        # Manually create a bad preview pointing to an invalid drive (Z:/)
        bad_preview = RenamePreview(
            item_id=test_item.id,
            original_path=test_item.current_path,
            target_name="CASE_TEST.mkv",
            target_subpath="Movies",
            item_type="movie",
            destination_root="Z:/invalid_drive/fake_path" # GUARANTEED FAILURE
        )
        
        success = renamer.execute_single(bad_preview, batch.id)
        if not success:
            logger.info("Success: Atomic move failed and rolled back as expected.")
            if Path(test_item.original_path).exists():
                logger.info("File remained safe at original location.")

    logger.info(">>> HELL PIPELINE COMPLETED SUCCESSFULLY.")
    # Keresünk egy elemet aminek vannak extrái
    # (Ebben a tesztben most csak egy simát rontunk el)
    test_item = db.query(MediaItem).filter(MediaItem.filename == "case_test.mkv").first()
    
    if test_item:
        batch = ActionBatch(name="Rollback Test")
        db.add(batch)
        db.commit()

        from app.formatter.formatter import RenamePreview
        # Kézzel gyártunk egy hibás preview-t (olyan helyre akarunk mozgatni ami nem létezik/védett)
        bad_preview = RenamePreview(
            item_id=test_item.id,
            original_path=test_item.current_path,
            target_name="CASE_TEST.mkv", # Csak case change
            target_subpath="Movies",
            item_type="movie",
            destination_root="Z:/invalid_drive/fake_path" # GARANTÁLT HIBA
        )
        
        success = renamer.execute_single(bad_preview, batch.id)
        if not success:
            logger.info("Siker: Az atomi mozgatás elbukott és visszagördült (ahogy vártuk).")
            # Ellenőrizzük, hogy a fájl még az eredeti helyén van-e
            if Path(test_item.original_path).exists():
                logger.info("A fájl biztonságban az eredeti helyén maradt.")

    logger.info(">>> POKOLJÁRÁS SIKERESEN BEFEJEZŐDÖTT.")
    db.close()

if __name__ == "__main__":
    run_hell_pipeline()
