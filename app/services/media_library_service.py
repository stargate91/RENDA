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
            unmatched=stats["unmatched"],
            genre_distribution=stats.get("genre_distribution", {}),
            decade_distribution=stats.get("decade_distribution", {})
        )

    def get_grouped_library(self) -> LibraryGroupedDTO:
        """Categorizes organized items for the Library UI."""
        from ..db.models import UserSetting
        ui_lang_setting = self.db.query(UserSetting).filter(UserSetting.key == "fallback_metadata_language").first()
        ui_lang = ui_lang_setting.value if ui_lang_setting and ui_lang_setting.value != "none" else None

        items = self.repository.get_library_items()
        library = {
            "movies": [], "series": [], "adult": [],
            "counts": {"movies": 0, "series": 0, "adult": 0}
        }

        for item in items:
            active_match = next((m for m in item.matches if m.is_active), None)
            loc = None
            if active_match and active_match.localizations:
                if ui_lang:
                    loc = next((l for l in active_match.localizations if l.target_language == ui_lang), None)
                if not loc:
                    loc = next((l for l in active_match.localizations if l.is_primary), active_match.localizations[0])
            
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
            # DTO doesn't have series_title, etc. Wait, we need to return extra fields!
            # Let's return a raw dictionary instead of DTO if DTO doesn't match the frontend expectations.
            
            data = {
                "id": item.id,
                "title": loc.title if loc else (item.fn_title or item.fd_title or item.filename),
                "year": active_match.release_date.year if active_match and active_match.release_date else (item.fn_year or item.fd_year),
                "poster_path": loc.poster_path if loc else None,
                "backdrop_path": loc.backdrop_path if loc else None,
                "still_path": loc.still_path if loc else None,
                "series_poster_path": loc.series_poster_path if loc else None,
                "rating": active_match.rating_tmdb if active_match else 0,
                "type": item.item_type.value,
                "path": item.current_path,
                "season_number": active_match.season_number if active_match else None,
                "episode_number": active_match.episode_number if active_match else None,
                "series_tmdb_id": active_match.series_tmdb_id if active_match else None,
                "tmdb_id": active_match.tmdb_id if active_match else None,
                "series_title": loc.series_title if loc else None,
                "season_title": loc.season_title if loc else None,
                "episode_title": loc.episode_title if loc else None,
                "is_favorite": item.is_favorite or False,
                "user_rating": item.user_rating,
                "custom_tags": [t.name for t in item.tags] if item.tags else [],
                "watch_count": getattr(item, "watch_count", 0),
                "is_watched": getattr(item, "is_watched", False),
                "resume_position": getattr(item, "resume_position", 0),
                "last_watched_at": getattr(item, "last_watched_at").isoformat() if getattr(item, "last_watched_at", None) else None,
                "duration": item.duration or 0
            }

            if active_match and active_match.is_adult:
                library["adult"].append(data)
                library["counts"]["adult"] += 1
            elif item.item_type == ItemType.MOVIE:
                library["movies"].append(data)
                library["counts"]["movies"] += 1
            elif item.item_type in [ItemType.SERIES, ItemType.EPISODE]:
                library["series"].append(data)
                library["counts"]["series"] += 1

        # --- Actors & Directors logic ---
        from ..db.models import Person, MediaPersonLink, MediaMatch, ItemStatus, MediaItem
        
        # 1. MATCHED aktív matchek ID-jai
        matched_match_ids = [
            m.id for m in self.db.query(MediaMatch).join(MediaItem).filter(
                MediaItem.status.in_([ItemStatus.RENAMED, ItemStatus.ORGANIZED])
            ).filter(MediaMatch.is_active == True).all()
        ]
        
        library["actors"] = []
        library["directors"] = []
        library["counts"]["actors"] = 0
        library["counts"]["directors"] = 0
        
        # Színészek lekérdezése (Csak aktív)
        from sqlalchemy import or_
        actor_filters = [Person.known_for_department == "Acting"]
        if matched_match_ids:
            actor_filters.append((MediaPersonLink.job == "Actor") & (MediaPersonLink.media_match_id.in_(matched_match_ids)))
            
        db_actors = self.db.query(Person).outerjoin(
            MediaPersonLink, MediaPersonLink.person_id == Person.id
        ).filter(
            Person.is_active == True,
            or_(*actor_filters)
        ).distinct().all()
        
        # Rendezők / Készítők lekérdezése (Csak aktív)
        director_filters = [Person.known_for_department.in_(["Directing", "Writing", "Creator"])]
        if matched_match_ids:
            director_filters.append((MediaPersonLink.job.in_(["Director", "Creator"])) & (MediaPersonLink.media_match_id.in_(matched_match_ids)))
            
        db_directors = self.db.query(Person).outerjoin(
            MediaPersonLink, MediaPersonLink.person_id == Person.id
        ).filter(
            Person.is_active == True,
            or_(*director_filters)
        ).distinct().all()
        for p in db_actors:
            loc = p.localizations[0] if p.localizations else None
            name = loc.name if loc else "Unknown Actor"
            
            library["actors"].append({
                "id": p.id,
                "title": name,
                "year": None,
                "poster_path": p.profile_path,
                "backdrop_path": None,
                "rating": p.popularity or 0.0,
                "type": "actor",
                "path": None,
                "is_active": p.is_active,
                "is_favorite": p.is_favorite,
                "user_rating": p.user_rating,
                "custom_tags": p.custom_tags or []
            })
            library["counts"]["actors"] += 1
            
        for p in db_directors:
            loc = p.localizations[0] if p.localizations else None
            name = loc.name if loc else "Unknown Director"
            
            library["directors"].append({
                "id": p.id,
                "title": name,
                "year": None,
                "poster_path": p.profile_path,
                "backdrop_path": None,
                "rating": p.popularity or 0.0,
                "type": "director",
                "path": None,
                "is_active": p.is_active,
                "is_favorite": p.is_favorite,
                "user_rating": p.user_rating,
                "custom_tags": p.custom_tags or []
            })
            library["counts"]["directors"] += 1

        # Collect all unique tags and associate them with their respective item references
        tags_map = {}
        
        # Movies/Series/Adult items
        for group in ["movies", "series", "adult"]:
            for item in library.get(group, []):
                tags = item.get("custom_tags")
                if tags and isinstance(tags, list):
                    for tag in tags:
                        tag_clean = tag.strip()
                        if not tag_clean:
                            continue
                        if tag_clean not in tags_map:
                            tags_map[tag_clean] = {
                                "name": tag_clean,
                                "movies": [],
                                "series": [],
                                "adult": [],
                                "actors": [],
                                "directors": [],
                                "total_count": 0
                            }
                        tags_map[tag_clean][group].append(item)
                        tags_map[tag_clean]["total_count"] += 1
                        
        # Actors
        for actor in library.get("actors", []):
            tags = actor.get("custom_tags")
            if tags and isinstance(tags, list):
                for tag in tags:
                    tag_clean = tag.strip()
                    if not tag_clean:
                        continue
                    if tag_clean not in tags_map:
                        tags_map[tag_clean] = {
                            "name": tag_clean,
                            "movies": [],
                            "series": [],
                            "adult": [],
                            "actors": [],
                            "directors": [],
                            "total_count": 0
                        }
                    tags_map[tag_clean]["actors"].append(actor)
                    tags_map[tag_clean]["total_count"] += 1
                    
        # Directors
        for director in library.get("directors", []):
            tags = director.get("custom_tags")
            if tags and isinstance(tags, list):
                for tag in tags:
                    tag_clean = tag.strip()
                    if not tag_clean:
                        continue
                    if tag_clean not in tags_map:
                        tags_map[tag_clean] = {
                            "name": tag_clean,
                            "movies": [],
                            "series": [],
                            "adult": [],
                            "actors": [],
                            "directors": [],
                            "total_count": 0
                        }
                    tags_map[tag_clean]["directors"].append(director)
                    tags_map[tag_clean]["total_count"] += 1
                    
        # Sort tags alphabetically
        library["tags"] = sorted(tags_map.values(), key=lambda t: t["name"].lower())
        library["counts"]["tags"] = len(library["tags"])

        return library

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes >= 1024 ** 4: return f"{size_bytes / (1024 ** 4):.1f} TB"
        if size_bytes >= 1024 ** 3: return f"{size_bytes / (1024 ** 3):.1f} GB"
        return f"{size_bytes / (1024 ** 2):.0f} MB"
