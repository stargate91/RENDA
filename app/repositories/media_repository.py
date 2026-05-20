from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from app.db.models import MediaItem, MediaMatch, ExtraFile, ItemStatus, ItemType, MovieEdition, MediaSource, MediaAudioType, PartType, PartStyle, ExtraSubtype, ExtraCategory

class MediaRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, item_id: int) -> Optional[MediaItem]:
        return self.db.query(MediaItem).filter(MediaItem.id == item_id).first()

    def get_extra_by_id(self, extra_id: int) -> Optional[ExtraFile]:
        return self.db.query(ExtraFile).filter(ExtraFile.id == extra_id).first()

    def get_discovery_items(self) -> List[MediaItem]:
        return self.db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations),
            joinedload(MediaItem.extras)
        ).filter(
            MediaItem.status.in_([
                ItemStatus.NEW, ItemStatus.MATCHED, 
                ItemStatus.UNCERTAIN, ItemStatus.NO_MATCH, 
                ItemStatus.MULTIPLE, ItemStatus.ERROR
            ])
        ).all()

    def get_discovery_extras(self) -> List[Tuple[ExtraFile, ItemStatus, str, str]]:
        return self.db.query(
            ExtraFile, 
            MediaItem.status,
            MediaItem.planned_path, 
            MediaItem.filename
        ).join(
            MediaItem, ExtraFile.parent_item_id == MediaItem.id
        ).all()

    def get_library_items(self) -> List[MediaItem]:
        return self.db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations)
        ).filter(
            MediaItem.status.in_([ItemStatus.ORGANIZED, ItemStatus.RENAMED])
        ).all()

    def delete_items(self, item_ids: List[int]):
        if item_ids:
            self.db.query(MediaItem).filter(MediaItem.id.in_(item_ids)).delete(synchronize_session=False)

    def delete_extras(self, extra_ids: List[int]):
        if extra_ids:
            self.db.query(ExtraFile).filter(ExtraFile.id.in_(extra_ids)).delete(synchronize_session=False)

    def get_stats(self) -> Dict[str, Any]:
        # Movies count
        total_movies = self.db.query(func.count(MediaItem.id)).filter(
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            MediaItem.item_type == ItemType.MOVIE
        ).scalar() or 0

        # Series count (distinct titles)
        total_series = self.db.query(
            func.count(func.distinct(func.coalesce(MediaItem.fd_title, MediaItem.fn_title)))
        ).filter(
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE])
        ).scalar() or 0

        # Episodes count
        total_episodes = self.db.query(func.count(MediaItem.id)).filter(
            MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED]),
            MediaItem.item_type.in_([ItemType.SERIES, ItemType.EPISODE])
        ).scalar() or 0

        # Storage & items for drive calculation
        items = self.db.query(MediaItem.current_path, MediaItem.size).all()
        total_bytes = sum(i.size for i in items if i.size)
        
        # Unmatched count
        unmatched = self.db.query(func.count(MediaItem.id)).filter(
            MediaItem.status.in_([
                ItemStatus.NEW, ItemStatus.MATCHED,
                ItemStatus.UNCERTAIN, ItemStatus.NO_MATCH,
                ItemStatus.MULTIPLE, ItemStatus.ERROR
            ])
        ).scalar() or 0

        # Genre and Decade distribution
        library_items = self.db.query(MediaItem).options(
            joinedload(MediaItem.matches).joinedload(MediaMatch.localizations)
        ).filter(
            MediaItem.status.in_([ItemStatus.ORGANIZED, ItemStatus.RENAMED])
        ).all()
        
        genre_dist = {}
        decade_dist = {}
        
        for item in library_items:
            active_match = next((m for m in item.matches if m.is_active), None)
            if active_match:
                # Decade calculation
                year = None
                if active_match.release_date:
                    year = active_match.release_date.year
                else:
                    year = item.fn_year or item.fd_year
                
                if year and year >= 1900:
                    decade = (year // 10) * 10
                    decade_str = f"{decade}s"
                    decade_dist[decade_str] = decade_dist.get(decade_str, 0) + 1
                    
                # Genre calculation (use primary localization or english if possible)
                if active_match.localizations:
                    loc = next((l for l in active_match.localizations if l.is_primary), active_match.localizations[0])
                    if loc.genres:
                        for g in loc.genres:
                            genre_dist[g] = genre_dist.get(g, 0) + 1

        return {
            "total_movies": total_movies,
            "total_series": total_series,
            "total_episodes": total_episodes,
            "total_bytes": total_bytes,
            "unmatched": unmatched,
            "genre_distribution": genre_dist,
            "decade_distribution": decade_dist,
            "items": items
        }

    def commit(self):
        self.db.commit()

    def rollback(self):
        self.db.rollback()
