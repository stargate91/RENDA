import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.db.models import TMDBCache, MediaMatch, MediaItem, MediaPersonLink, Person, PersonLocalization
from app.services.metadata_enrichment_service import MetadataEnrichmentService

db = Session()
try:
    # 1. Clear TMDB Cache for Stargate SG-1 (ID 4629)
    caches = db.query(TMDBCache).filter(TMDBCache.tmdb_id == 4629).all()
    print(f"Found {len(caches)} cache entries for TMDB ID 4629. Deleting them...")
    for c in caches:
        db.delete(c)
    db.commit()
    
    # 2. Get Match 292
    match = db.query(MediaMatch).filter(MediaMatch.id == 292).first()
    if not match:
        print("Match ID 292 not found.")
        sys.exit(1)
        
    print(f"Match: ID={match.id}, TMDB ID={match.tmdb_id}, Type={match.media_item.item_type if match.media_item else 'Unknown'}")
    
    # Get the media item
    item = match.media_item
    if not item:
        print("Media item not associated with match.")
        sys.exit(1)
        
    # Clear existing people links for match 292 to see what the enricher creates
    db.query(MediaPersonLink).filter(MediaPersonLink.media_match_id == 292).delete()
    db.commit()
    
    # 3. Re-enrich metadata using MetadataEnrichmentService
    print("Re-enriching metadata...")
    enricher = MetadataEnrichmentService(db)
    enricher.enrich_matched_item(item, language="en")
    
    # Re-query links
    db.expire_all()
    links = db.query(MediaPersonLink).filter(MediaPersonLink.media_match_id == 292).all()
    print(f"\nAfter re-enrichment: Found {len(links)} links:")
    for l in links:
        person = db.query(Person).filter(Person.id == l.person_id).first()
        loc = person.localizations[0] if person and person.localizations else None
        name = loc.name if loc else "Unknown"
        print(f"  Person ID: {l.person_id}, Name: {name}, Job: {l.job}, Character Name: {l.character_name}")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
