import logging
from pathlib import Path
from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from ..db.models import MediaItem, MediaMatch, MetadataLocalization, ItemStatus, ItemType, Person, ImageStatus
from ..resolver.resolver import Resolver
from ..api.omdb_client import OMDBClient
from ..utils.db_utils import with_db_retry
from ..services.person_service import PersonService
from ..schemas.tmdb import TMDBMovie, TMDBSeries, TMDBEpisode

logger = logging.getLogger(__name__)

class MetadataEnrichmentService:
    """
    Orchestrates deep metadata gathering from remote sources (TMDB, OMDB).
    Populates local database with rich descriptions, cast members, and localized titles.
    """

    def __init__(self, db_session: Session):
        self.db = db_session
        self.resolver = Resolver(db_session)
        self.omdb = OMDBClient(db_session)
        self.person_service = PersonService(db_session)

    @with_db_retry()
    def enrich_matched_item(self, item: MediaItem, language: str = "en", fallback_language: str = None):
        """Main entry point for enriching a matched item with all available metadata."""
        active_match = self.db.query(MediaMatch).filter(MediaMatch.media_item_id == item.id, MediaMatch.is_active == True).first()
        if not active_match: return

        # Perform enrichment for primary and optional fallback languages
        languages = [lang for lang in [language, fallback_language] if lang]
        for lang in languages:
            if active_match.item_type == ItemType.MOVIE:
                self._enrich_movie(active_match, lang)
            elif active_match.item_type in [ItemType.SERIES, ItemType.EPISODE]:
                self._enrich_tv(active_match, lang)

        # Sync physical planned path with new metadata
        self._refresh_planned_path(item, active_match)
        self.db.commit()

    def _enrich_movie(self, match: MediaMatch, language: str):
        details: TMDBMovie = self.resolver.get_details(match.tmdb_id, ItemType.MOVIE, language=language)
        if not details: return

        # Update core match properties
        self._update_match_common(match, details)
        match.is_adult = details.adult
        match.release_status = details.status
        match.budget = details.budget
        match.revenue = details.revenue
        match.collection = details.belongs_to_collection.name if details.belongs_to_collection else None
        
        # Queue images
        if details.poster_path: match.image_status = ImageStatus.PENDING
        if details.backdrop_path: match.backdrop_status = ImageStatus.PENDING
        
        # Update localization
        loc = self._get_or_create_loc(match, language)
        loc.title = details.title
        loc.overview = details.overview
        loc.tagline = details.tagline
        loc.poster_path = details.poster_path
        loc.backdrop_path = details.backdrop_path
        loc.genres = [g.name for g in details.genres]
        loc.original_title = details.original_title
        loc.original_language = details.original_language

    def _enrich_tv(self, match: MediaMatch, language: str):
        series: TMDBSeries = self.resolver.get_details(match.tmdb_id, ItemType.SERIES, language=language)
        if not series: return

        # Update series-level properties
        self._update_match_common(match, series)
        match.series_type = series.type
        match.number_of_seasons = series.number_of_seasons
        match.number_of_episodes = series.number_of_episodes
        match.networks = [n.name for n in series.networks]
        
        # Queue images
        if series.poster_path: match.image_status = ImageStatus.PENDING
        if series.backdrop_path: match.backdrop_status = ImageStatus.PENDING
        
        loc = self._get_or_create_loc(match, language)
        loc.title = series.name
        loc.original_title = series.original_name
        loc.series_title = series.name
        loc.original_series_title = series.original_name
        loc.overview = series.overview
        loc.poster_path = series.poster_path
        loc.series_poster_path = series.poster_path
        loc.backdrop_path = series.backdrop_path
        loc.genres = [g.name for g in series.genres]
        loc.origin_country = series.origin_country
        loc.original_language = series.original_language

        if match.season_number is not None:
            self._enrich_tv_hierarchy(match, series, language)

    def _enrich_tv_hierarchy(self, match: MediaMatch, series: TMDBSeries, language: str):
        """Enriches season and episode specific data."""
        loc = self._get_or_create_loc(match, language)
        
        # Season info
        # Note: raw data from TMDB for 'seasons' list is still used or we extend TMDBSeries DTO
        # For simplicity, we'll assume series DTO might need raw 'seasons' or we fetch via resolver
        # ... assuming we use a more robust series DTO here
        
        if match.episode_number is not None:
            ep_nums = match.episode_number if isinstance(match.episode_number, list) else [match.episode_number]
            titles, overviews, stills = [], [], []
            
            for enum in ep_nums:
                ep: TMDBEpisode = self.resolver.get_episode_details(match.tmdb_id, match.season_number, enum, language=language)
                if ep:
                    titles.append(ep.name or f"Episode {enum}")
                    if ep.overview: overviews.append(ep.overview)
                    if ep.still_path: stills.append(ep.still_path)
                    
                    if enum == ep_nums[0]:
                        match.rating_tmdb = ep.vote_average
                        match.runtime = ep.runtime or match.runtime
            
            if titles:
                loc.episode_title = " / ".join(titles)
                loc.overview = "\n\n".join(overviews) if overviews else loc.overview
                loc.still_path = stills[0] if stills else None

    def _update_match_common(self, match: MediaMatch, details: Union[TMDBMovie, TMDBSeries]):
        """Updates properties shared by both Movies and TV Shows."""
        if isinstance(details, TMDBMovie):
            match.runtime = details.runtime
        elif isinstance(details, TMDBSeries):
            match.runtime = details.episode_run_time[0] if details.episode_run_time else None
            
        match.popularity = details.popularity
        match.rating_tmdb = details.vote_average
        match.vote_count_tmdb = details.vote_count
        
        # IMDb / OMDB Sync
        imdb_id = getattr(details, 'imdb_id', None) or match.imdb_id
        if imdb_id:
            match.imdb_id = imdb_id
            self._sync_omdb_ratings(match, imdb_id)
            
        # 3. People (Cast & Crew)
        if details.credits:
            self._process_people(match, details)

    def _process_people(self, match: MediaMatch, details: Union[TMDBMovie, TMDBSeries]):
        """Extracts and persists cast and crew information."""
        credits = details.credits
        cast = credits.cast[:10]
        crew = credits.crew
        
        # Determine directors/creators
        creators = []
        if isinstance(details, TMDBMovie):
            creators = [p for p in crew if p.job == "Director"][:2]
        else:
            # Handle TV creators from 'created_by' or producers/directors in crew
            creators = [p for p in crew if p.job in ["Executive Producer", "Director"]][:2]

        processed_ids = set()
        
        # 1. Process Directors/Creators
        for i, p in enumerate(creators):
            person = self.person_service.get_or_create_person(p.dict())
            self.person_service.link_person_to_match(match, person, job="Director" if isinstance(details, TMDBMovie) else "Creator")
            processed_ids.add(p.id)
            if i == 0: match.director = p.name

        # 2. Process Top Cast
        for i, p in enumerate(cast):
            if p.id in processed_ids: continue
            person = self.person_service.get_or_create_person(p.dict())
            self.person_service.link_person_to_match(match, person, job="Actor", character=p.character, order=i)
            processed_ids.add(p.id)

    def _sync_omdb_ratings(self, match: MediaMatch, imdb_id: str):
        omdb = self.omdb.get_ratings(imdb_id)
        if not omdb: return
        try:
            match.rating_imdb = float(omdb["imdb_rating"]) if omdb.get("imdb_rating") != "N/A" else match.rating_imdb
            match.rating_rotten = omdb.get("rotten_tomatoes") or match.rating_rotten
            match.rating_meta = int(omdb["metascore"]) if omdb.get("metascore") != "N/A" else match.rating_meta
        except: pass

    def _get_or_create_loc(self, match: MediaMatch, language: str) -> MetadataLocalization:
        loc = self.db.query(MetadataLocalization).filter(MetadataLocalization.match_id == match.id, MetadataLocalization.target_language == language).first()
        if not loc:
            loc = MetadataLocalization(match_id=match.id, target_language=language)
            self.db.add(loc)
        return loc

    def _refresh_planned_path(self, item: MediaItem, match: MediaMatch):
        from ..formatter.formatter import Formatter, FormatterConfig
        config = FormatterConfig.from_db(self.db)
        formatter = Formatter(config)
        loc = next((l for l in match.localizations if l.is_primary), match.localizations[0]) if match.localizations else None
        if loc:
            preview = formatter.format_item(item, match, loc)
            item.planned_path = str(Path(preview.target_subpath) / preview.target_name).replace("\\", "/") if preview.target_subpath else preview.target_name
