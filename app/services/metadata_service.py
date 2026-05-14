import logging
import threading
from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session, joinedload
from ..db.models import MediaItem, MediaMatch, ItemStatus, ItemType, UserSetting, TMDBCache
from ..db.base import Session as SessionFactory
from ..services.metadata_enrichment_service import MetadataEnrichmentService
from ..scanner.image_worker import ImageWorker

logger = logging.getLogger(__name__)

class MetadataService:
    """
    Handles business logic for media metadata management, 
    including manual resolution, enrichment orchestration, and metadata presentation.
    """

    def __init__(self, db: Session):
        self.db = db

    def resolve_item_metadata(self, item_id: int, targets: List[Any]) -> Dict[str, Any]:
        """
        Manually resolves a media item to one or more TMDB targets.
        Orchestrates match creation, status updates, and enrichment.
        """
        item = self.db.query(MediaItem).filter(MediaItem.id == item_id).first()
        if not item:
            raise ValueError("Item not found")

        # 1. Deactivate existing matches
        self.db.query(MediaMatch).filter(MediaMatch.media_item_id == item.id).update({"is_active": False})
        
        final_item_type = ItemType.MOVIE
        
        for target in targets:
            # Handle episode lists
            target_episode = target.episode
            if target.episodes and len(target.episodes) > 0:
                target_episode = target.episodes if len(target.episodes) > 1 else target.episodes[0]

            # Determine Specific ItemType
            m_type = self._determine_match_type(target, target_episode)
            final_item_type = m_type

            # Create or update match
            match = self._upsert_match(item.id, target, target_episode, m_type)

        # Update item status
        item.status = ItemStatus.MATCHED if final_item_type in [ItemType.MOVIE, ItemType.EPISODE] else ItemStatus.UNCERTAIN
        item.item_type = final_item_type
        
        self.db.commit()

        # 2. Enrich in-process (or background if preferred)
        self._trigger_enrichment(item)
        
        # 3. Trigger image worker in background
        self._trigger_image_worker()

        return {"status": "success", "match_id": match.id}

    def get_full_item_metadata(self, item_id: int) -> Dict[str, Any]:
        """
        Aggregates all metadata for an item (technical, guessit, matches, localizations).
        Moved from route for better testability and reuse.
        """
        item = self.db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations)
        ).filter(MediaItem.id == item_id).first()
        
        if not item:
            raise ValueError("Item not found")

        # Building the complex response dictionary
        return {
            "id": item.id,
            "filename": item.filename,
            "folder": item.folder_name,
            "technical": self._get_tech_data(item),
            "guessit": self._get_guessit_data(item),
            "overrides": {
                "target_language": item.target_language,
                "source": item.source.value if item.source else None,
                "edition": item.edition.value if item.edition else None,
                "audio_type": item.audio_type.value if item.audio_type else None
            },
            "matches": self._get_matches_data(item)
        }

    def _determine_match_type(self, target: Any, target_episode: Any) -> ItemType:
        if target.item_type in ["tv", "series"]:
            if target_episode is not None: return ItemType.EPISODE
            elif target.season is not None: return ItemType.SEASON
            return ItemType.SERIES
        elif target.item_type == "season": return ItemType.SEASON
        elif target.item_type == "episode": return ItemType.EPISODE
        return ItemType.MOVIE

    def _upsert_match(self, item_id: int, target: Any, target_episode: Any, m_type: ItemType) -> MediaMatch:
        match = self.db.query(MediaMatch).filter(
            MediaMatch.media_item_id == item_id,
            MediaMatch.tmdb_id == target.tmdb_id,
            MediaMatch.season_number == target.season,
            MediaMatch.episode_number == target_episode
        ).first()

        if not match:
            match = MediaMatch(
                media_item_id=item_id, tmdb_id=target.tmdb_id, item_type=m_type,
                season_number=target.season, episode_number=target_episode,
                is_active=True, confidence_score=1.0
            )
            self.db.add(match)
        else:
            match.is_active = True
            match.item_type = m_type
            match.episode_number = target_episode
            match.season_number = target.season
        return match

    def _trigger_enrichment(self, item: MediaItem):
        lang = self.db.query(UserSetting).filter(UserSetting.key == "primary_metadata_language").first()
        fallback = self.db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
        
        enricher = MetadataEnrichmentService(self.db)
        enricher.enrich_matched_item(
            item, 
            language=lang.value if lang else "en",
            fallback_language=fallback.value if fallback and fallback.value != "none" else None
        )

    def _trigger_image_worker(self):
        def run_worker():
            local_db = SessionFactory()
            try:
                iw = ImageWorker(local_db, "./data")
                iw.process_all()
            finally:
                local_db.close()
        threading.Thread(target=run_worker, daemon=True).start()

    def _get_tech_data(self, item: MediaItem) -> Dict[str, Any]:
        return {
            "duration": item.duration,
            "size_mb": round(item.size / (1024 * 1024), 2) if item.size else 0,
            "resolution": item.resolution,
            "video_codec": item.video_codec,
            "video_bitrate": item.video_bitrate,
            "audio_codec": item.audio_codec,
            "audio_channels": item.audio_channels,
            "audio_bitrate": item.audio_bitrate,
            "bit_depth": item.bit_depth,
            "hdr_type": item.hdr_type,
            "framerate": item.framerate,
            "audio_streams": item.audio_streams or []
        }

    def _get_guessit_data(self, item: MediaItem) -> Dict[str, Any]:
        # Extracting all 'fn_' and 'fd_' and 'it_' fields
        res = {}
        for prefix in ['fn_', 'fd_', 'it_', 'nfo_', 'internal_']:
            for attr in dir(item):
                if attr.startswith(prefix):
                    res[attr] = getattr(item, attr)
        return res

    def _get_matches_data(self, item: MediaItem) -> List[Dict[str, Any]]:
        matches_data = []
        for match in item.matches:
            # Aggregate API responses from cache
            tmdb_caches = self.db.query(TMDBCache).filter(TMDBCache.tmdb_id == match.tmdb_id).all()
            api_responses = {c.target_language: c.raw_data for c in tmdb_caches}
            
            matches_data.append({
                "id": match.id,
                "tmdb_id": match.tmdb_id,
                "type": match.item_type.value if match.item_type else "unknown",
                "is_active": match.is_active,
                "localizations": [self._format_loc(loc) for loc in match.localizations],
                "api_responses": api_responses,
                # ... other match fields can be added here
                "director": match.director,
                "cast": match.cast,
                "collection": match.collection,
            })
        return matches_data

    def _format_loc(self, loc: Any) -> Dict[str, Any]:
        # Helper to avoid massive inline dict building
        return {
            "language": loc.target_language,
            "title": loc.title,
            "overview": loc.overview,
            "poster_path": loc.poster_path,
            "local_poster_path": loc.local_poster_path,
            # ... and so on
        }
