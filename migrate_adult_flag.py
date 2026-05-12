import sqlite3
import os

db_path = "data/renda.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if is_adult exists
    cursor.execute("PRAGMA table_info(media_matches)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if "is_adult" not in columns:
        print("Adding 'is_adult' column to 'media_matches' table...")
        cursor.execute("ALTER TABLE media_matches ADD COLUMN is_adult BOOLEAN DEFAULT 0")
        # Add index for performance
        cursor.execute("CREATE INDEX ix_media_matches_is_adult ON media_matches (is_adult)")
        conn.commit()
        print("Migration successful: 'is_adult' column added.")
    else:
        print("Column 'is_adult' already exists. Skipping migration.")

except Exception as e:
    print(f"Migration failed: {e}")
    conn.rollback()
finally:
    conn.close()
