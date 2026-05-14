import sqlite3
import os

db_path = 'data/renda.db'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

columns_to_add = [
    ('all_stills', 'JSON'),
    ('local_all_stills', 'JSON')
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE metadata_localizations ADD COLUMN {col_name} {col_type}")
        print(f"Successfully added column: {col_name}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print(f"Column {col_name} already exists.")
        else:
            print(f"Error adding {col_name}: {e}")

conn.commit()
conn.close()
print("Migration complete.")
