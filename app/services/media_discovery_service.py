import logging
from typing import List, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session
from ..db.models import ItemStatus, ItemType, MediaItem
from ..formatter.formatter import Formatter, FormatterConfig
from ..repositories.media_repository import MediaRepository
from ..schemas.media import MediaItemDTO, MediaMatchDTO, MediaImageDTO, ExtraFileDTO, DiscoveryGroupsDTO

logger = logging.getLogger(__name__)

class MediaDiscoveryService:
    """
    Handles the logic for presenting newly discovered media items.
    Calculates previews and groups items for the Discovery Console.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = MediaRepository(db)

    def get_discovery_groups(self) -> DiscoveryGroupsDTO:
        """Aggregates and groups items for the discovery view."""
        config = FormatterConfig.from_db(self.db)
        formatter = Formatter(config)

        items = self.repository.get_discovery_items()
        extras = self.repository.get_discovery_extras()
        
        groups = {"manual": [], "movies": [], "series": [], "extras": [], "collisions": []}
        parent_planned_paths = {}

        # Collision detection (grouping by planned_path)
        path_counts = {}
        item_data = []
        for item in items:
            p_path = self._calculate_planned_path(item, formatter)
            parent_planned_paths[item.id] = p_path
            if p_path:
                path_counts[p_path.lower()] = path_counts.get(p_path.lower(), 0) + 1
            item_data.append((item, p_path))
        
        for item, p_path in item_data:
            dto = self._serialize_item(item, p_path)
            
            is_collision = False
            if p_path and path_counts[p_path.lower()] > 1:
                is_collision = True
            elif item.group_hash:
                hash_match_count = sum(1 for i in items if i.group_hash == item.group_hash)
                if hash_match_count > 1:
                    is_collision = True

            if is_collision:
                groups["collisions"].append(dto)
            elif item.status in [ItemStatus.NEW, ItemStatus.UNCERTAIN, ItemStatus.NO_MATCH, ItemStatus.MULTIPLE, ItemStatus.ERROR]:
                groups["manual"].append(dto)
            else:
                if item.item_type == ItemType.MOVIE:
                    groups["movies"].append(dto)
                elif item.item_type in [ItemType.SERIES, ItemType.EPISODE]:
                    groups["series"].append(dto)
                else:
                    groups["movies"].append(dto)

        groups["extras"] = self._process_extras(extras, parent_planned_paths, formatter)
        return DiscoveryGroupsDTO(**groups)

    def _calculate_planned_path(self, item: MediaItem, formatter: Formatter) -> str:
        p_path = item.planned_path
        active_match = next((m for m in item.matches if m.is_active), None)
        if (item.status in [ItemStatus.MATCHED, ItemStatus.RENAMED, ItemStatus.ORGANIZED]) and active_match:
            try:
                loc = active_match.localizations[0] if active_match.localizations else None
                if loc:
                    preview = formatter.format_item(item, active_match, loc)
                    p_path = str(Path(preview.target_subpath) / preview.target_name).replace("\\", "/") if preview.target_subpath else preview.target_name
            except Exception as ex:
                logger.warning(f"Failed to calculate planned path for item {item.id}: {ex}")
        return p_path

    def _serialize_item(self, item: MediaItem, p_path: str) -> MediaItemDTO:
        images = []
        for am in [m for m in item.matches if m.is_active]:
            loc = am.localizations[0] if am.localizations else None
            if loc:
                if loc.still_path: images.append(MediaImageDTO(type="episode", path=f"/media/images/stills{loc.still_path}"))
                if loc.poster_path: images.append(MediaImageDTO(type="poster", path=f"/media/images/posters{loc.poster_path}"))

        matches = []
        for m in item.matches:
            loc = m.localizations[0] if m.localizations else None
            matches.append(MediaMatchDTO(
                id=m.id, tmdb_id=m.tmdb_id, type=m.item_type.value if m.item_type else "movie",
                title=loc.title if loc else (loc.series_title if loc else ""),
                year=m.release_date.year if m.release_date else (m.first_air_date.year if m.first_air_date else None),
                poster_path=loc.poster_path if loc else None,
                vote_average=m.rating_tmdb, is_active=m.is_active, confidence=m.confidence_score
            ))

        return MediaItemDTO(
            id=item.id, filename=item.filename, status=item.status.value,
            type=item.item_type.value if item.item_type else "unknown",
            title=item.fn_title or item.fd_title or item.filename,
            year=item.fn_year or item.fd_year, planned_path=p_path,
            extension=item.extension, size_mb=round(item.size / (1024 * 1024), 2) if item.size else 0,
            images=images, matches=matches, current_path=item.current_path
        )

    def _process_extras(self, extras: List[Any], parent_planned_paths: Dict[int, str], formatter: Formatter) -> List[ExtraFileDTO]:
        extra_paths = []
        path_counts = {}
        for ex, p_status, p_planned, p_filename in extras:
            parent_p_path = parent_planned_paths.get(ex.parent_item_id) or p_planned
            raw_parent_name = parent_p_path if parent_p_path else p_filename
            parent_name_stem = Path(raw_parent_name).stem
            parent_dir = str(Path(raw_parent_name).parent) if parent_p_path else ""
            
            # Using formatter logic to predict extra names
            # (Assuming Formatter has these helper methods or we use a more generic approach)
            extra_ctx = formatter.context.build_extra_context(ex, parent_name_stem)
            extra_name = formatter._render("{ParentName}-{SubCategory}", extra_ctx)
            extra_sub = formatter.config.extras_subfolder_name if formatter.config.extras_folder_mode == "subfolder" else ""
            
            planned_path = str(Path(parent_dir) / extra_sub / extra_name).replace("\\", "/")
            path_counts[planned_path.lower()] = path_counts.get(planned_path.lower(), 0) + 1
            extra_paths.append((ex, planned_path, parent_name_stem))

        result = []
        current_counts = {}
        for ex, raw_p, parent_name in extra_paths:
            p_path = raw_p
            if path_counts[raw_p.lower()] > 1:
                current_counts[raw_p.lower()] = current_counts.get(raw_p.lower(), 0) + 1
                p_path = f"{Path(raw_p).stem} {current_counts[raw_p.lower()]}{ex.extension}"

            result.append(ExtraFileDTO(
                id=ex.id, parent_id=ex.parent_item_id, parent_name=parent_name,
                filename=Path(ex.original_path).name, extension=ex.extension,
                category=ex.category.value, subtype=ex.subtype.value if ex.subtype else "other",
                language=ex.language, path=ex.original_path, planned_path=p_path
            ))
        return result
