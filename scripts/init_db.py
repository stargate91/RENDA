from app.db.base import engine, Base
from app.db.models import MediaItem, MediaMatch, MetadataLocalization, ExtraFile

def init_db():
    print("Adatbázis inicializálása (RENDA 3-level schema)...")
    Base.metadata.create_all(bind=engine)
    print("Sikeresen létrehozva a táblák: media_items, media_matches, metadata_localizations, extra_files")

if __name__ == "__main__":
    init_db()
