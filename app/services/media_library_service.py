import logging
from sqlalchemy.orm import Session
from ..db.models import ItemType
from ..repositories.media_repository import MediaRepository
from ..schemas.media import LibraryStatsDTO, LibraryGroupedDTO, LibraryItemDTO

logger = logging.getLogger(__name__)

class MediaLibraryService:
    """
    Handles retrieval and statistics for the organized media library.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = MediaRepository(db)

    def get_stats(self) -> LibraryStatsDTO:
        """Returns high-level statistics about the library content and storage."""
        stats = self.repository.get_stats()
        
        # Drive detection logic
        drives = set()
        for i in stats["items"]:
            if i.current_path:
                if ":" in i.current_path:
                    drives.add(i.current_path.split(":")[0].upper() + ":")
                elif i.current_path.startswith("/"):
                    parts = i.current_path.split("/")
                    if len(parts) > 2 and parts[1] in ["mnt", "media", "Volumes"]:
                        drives.add("/" + parts[1] + "/" + parts[2])
                    else:
                        drives.add("/")
        
        total_bytes = stats["total_bytes"]
        storage_str = self._format_size(total_bytes)

        return LibraryStatsDTO(
            total_movies=stats["total_movies"],
            total_series=stats["total_series"],
            total_episodes=stats["total_episodes"],
            storage=storage_str,
            drive_count=len(drives) if drives else 0,
            unmatched=stats["unmatched"]
        )

    def get_grouped_library(self) -> LibraryGroupedDTO:
        """Categorizes organized items for the Library UI."""
        items = self.repository.get_library_items()
        library = {
            "movies": [], "series": [], "adult": [],
            "counts": {"movies": 0, "series": 0, "adult": 0}
        }

        for item in items:
            active_match = next((m for m in item.matches if m.is_active), None)
            loc = active_match.localizations[0] if active_match and active_match.localizations else None
            
            dto = LibraryItemDTO(
                id=item.id,
                title=loc.title if loc else (item.fn_title or item.fd_title or item.filename),
                year=active_match.release_date.year if active_match and active_match.release_date else (item.fn_year or item.fd_year),
                poster_path=loc.poster_path if loc else None,
                backdrop_path=loc.backdrop_path if loc else None,
                rating=active_match.rating_tmdb if active_match else 0,
                type=item.item_type.value,
                path=item.current_path
            )

            if active_match and active_match.is_adult:
                library["adult"].append(dto)
                library["counts"]["adult"] += 1
            elif item.item_type == ItemType.MOVIE:
                library["movies"].append(dto)
                library["counts"]["movies"] += 1
            elif item.item_type in [ItemType.SERIES, ItemType.EPISODE]:
                library["series"].append(dto)
                library["counts"]["series"] += 1

        return LibraryGroupedDTO(**library)

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes >= 1024 ** 4: return f"{size_bytes / (1024 ** 4):.1f} TB"
        if size_bytes >= 1024 ** 3: return f"{size_bytes / (1024 ** 3):.1f} GB"
        return f"{size_bytes / (1024 ** 2):.0f} MB"
