import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Session
from app.db.models import TMDBCache, MediaMatch, MediaItem, MediaPersonLink, ItemType, UserSetting
from app.services.metadata_enrichment_service import MetadataEnrichmentService

db = Session()
try:
    # 1. Find all active TV matches
    tv_matches = db.query(MediaMatch).join(MediaItem).filter(
        MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE]),
        MediaMatch.is_active == True
    ).all()
    
    print(f"Found {len(tv_matches)} active TV matches to process.")
    
    # 2. Collect unique series TMDB IDs
    unique_tmdb_ids = set()
    for m in tv_matches:
        if m.tmdb_id:
            try:
                unique_tmdb_ids.add(int(m.tmdb_id))
            except ValueError:
                pass
                
    print(f"Unique TMDB IDs: {unique_tmdb_ids}")
    
    # 3. Clear cache for these unique TMDB IDs
    for tmdb_id in unique_tmdb_ids:
        caches = db.query(TMDBCache).filter(TMDBCache.tmdb_id == tmdb_id).all()
        if caches:
            print(f"Deleting {len(caches)} cache entries for TMDB ID {tmdb_id}...")
            for c in caches:
                db.delete(c)
    db.commit()
    
    # Get user preferred fallback language
    ui_lang_setting = db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
    ui_lang = ui_lang_setting.value if ui_lang_setting and ui_lang_setting.value != "none" else "en"
    
    # 4. Re-enrich each TV match
    enricher = MetadataEnrichmentService(db)
    for idx, match in enumerate(tv_matches):
        print(f"[{idx+1}/{len(tv_matches)}] Re-enriching Match ID {match.id} (TMDB ID {match.tmdb_id})...")
        
        # Clear existing person links for this match
        db.query(MediaPersonLink).filter(MediaPersonLink.media_match_id == match.id).delete()
        db.commit()
        
        # Enrich
        try:
            enricher.enrich_matched_item(match.media_item, language=ui_lang)
            db.commit()
        except Exception as ex:
            print(f"  Failed to enrich Match ID {match.id}: {ex}")
            db.rollback()
            
    print("\nRe-enrichment completed successfully!")
    
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
