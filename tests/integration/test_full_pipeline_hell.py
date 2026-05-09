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
    """Executes the full pipeline test covering various failure and performance scenarios."""
    setup_hell_env()
    dirty_files = create_dirty_files()
    
    db = ScopedSession()
    # 0 ms size means we probe everything for the test
    scanner = ScannerManager(db, min_video_size_mb=0)
    renamer = RenamerEngine(db)
    formatter = Formatter()

    # --- STEP 1: INITIAL SCAN (Warm-up) ---
    logger.info(">>> STEP 1: STARTING INITIAL SCAN (Metadata Fetch)")
    start_time = time.time()
    scanner.scan_and_save([str(SOURCE_DIR)])
    initial_duration = time.time() - start_time
    
    items = db.query(MediaItem).all()
    logger.info(f"Scanned {len(items)} items in {initial_duration:.2f}s.")

    # --- STEP 2: CACHE TEST (The 0-second re-scan) ---
    logger.info(">>> STEP 2: CACHE TEST: Scanning again...")
    start_time = time.time()
    scanner.scan_and_save([str(SOURCE_DIR)])
    cache_duration = time.time() - start_time
    
    logger.info(f"Re-scan duration: {cache_duration:.4f}s (Should be near zero due to mtime/cache).")
    if cache_duration > initial_duration / 2:
         logger.warning("Cache/mtime optimization might not be working as expected!")

    # --- STEP 3: MTIME MODIFICATION TEST ---
    logger.info(">>> STEP 3: MTIME TEST: Modifying a file...")
    stable_file = SOURCE_DIR / "stable_file.mkv"
    time.sleep(1.1) 
    with open(stable_file, "ab") as f:
        f.write(b"modified_data")
    
    start_time = time.time()
    scanner.scan_and_save([str(SOURCE_DIR)])
    mtime_duration = time.time() - start_time
    logger.info(f"Modified file re-scan: {mtime_duration:.4f}s.")

    # --- STEP 4: MAX_PATH WARNING TEST ---
    logger.info(">>> STEP 4: MAX_PATH TEST")
    long_item = db.query(MediaItem).filter(MediaItem.filename.contains("A" * 100)).first()
    if long_item:
        # Destination path > 260 chars
        very_long_dest = "D" * 200
        preview = formatter.plan_rename(long_item.matches[0], str(DEST_DIR / very_long_dest))
        if any("path too long" in w.lower() for w in preview.warnings):
            logger.info("Success: MAX_PATH warning detected correctly.")

    # --- STEP 5: ATOMIC ROLLBACK TEST ---
    logger.info(">>> STEP 5: ROLLBACK TEST: Simulating I/O failure...")
    test_item = db.query(MediaItem).filter(MediaItem.filename == "case_test.mkv").first()
    
    if test_item:
        batch = ActionBatch(name="Atomic Rollback Verification")
        db.add(batch)
        db.commit()

        from app.formatter.formatter import RenamePreview
        bad_preview = RenamePreview(
            item_id=test_item.id,
            original_path=test_item.current_path,
            target_name="CASE_TEST_RECOVERY.mkv",
            target_subpath="Movies",
            item_type="movie",
            destination_root="Z:/invalid_path/fails_immediately" 
        )
        
        success = renamer.execute_single(bad_preview, batch.id)
        if not success:
            logger.info("Success: Atomic operation failed and rolled back.")
            if Path(test_item.original_path).exists():
                logger.info("Verification: Original file is untouched.")

    logger.info(">>> ABYSS PIPELINE TEST COMPLETED.")
    db.close()
if __name__ == "__main__":
    run_hell_pipeline()
