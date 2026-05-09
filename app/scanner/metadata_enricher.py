import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from ..db.models import MediaItem, MediaMatch, MetadataLocalization, ItemStatus, ItemType
from ..api.tmdb_client import TMDBClient
from ..api.omdb_client import OMDBClient

logger = logging.getLogger(__name__)

class MetadataEnricher:
    """
    TMDB és OMDb metaadat-gazdagító: letölti a teljes hierarchiát és az értékeléseket.
    """

    def __init__(self, db_session: Session):
        self.db = db_session
        self.api = TMDBClient(db_session)
        self.omdb = OMDBClient(db_session)

    def enrich_matched_item(self, item: MediaItem, language: str = "en"):
        """
        Végrehajtja a teljes metaadat-letöltést az aktív találathoz.
        """
        active_match = self.db.query(MediaMatch).filter(
            MediaMatch.media_item_id == item.id,
            MediaMatch.is_active == True
        ).first()

        if not active_match: return

        if active_match.item_type == ItemType.MOVIE:
            self._enrich_movie(active_match, language)
        elif active_match.item_type == ItemType.SERIES or active_match.item_type == ItemType.EPISODE:
            self._enrich_tv(active_match, language)

        self.db.commit()

    def _enrich_movie(self, match: MediaMatch, language: str):
        """Filmek gazdagítása."""
        details = self.api.get_details(match.tmdb_id, item_type="movie", language=language)
        if not details: return

        # 1. Globális adatok
        self._update_match_common(match, details)
        match.release_status = details.get("status")  # Released, In Production, stb.
        match.budget = details.get("budget")
        match.revenue = details.get("revenue")
        # Collection
        coll = details.get("belongs_to_collection")
        match.collection = coll.get("name") if coll else None
        
        # 2. Lokalizáció
        loc = self._get_or_create_loc(match, language)
        loc.title = details.get("title")
        loc.overview = details.get("overview")
        loc.tagline = details.get("tagline")
        loc.poster_path = details.get("poster_path")
        loc.backdrop_path = details.get("backdrop_path")
        loc.genres = [g["name"] for g in details.get("genres", [])]
        loc.original_title = details.get("original_title")
        loc.original_language = details.get("original_language")

    def _enrich_tv(self, match: MediaMatch, language: str):
        """Sorozatok és epizódok gazdagítása (Sorozat -> Szezon -> Epizód lánc)."""
        # A. SOROZAT SZINT
        series_details = self.api.get_details(match.tmdb_id, item_type="tv", language=language)
        if not series_details: return

        self._update_match_common(match, series_details)
        match.release_status = series_details.get("status")  # Ended, Returning Series, Canceled
        match.series_type = series_details.get("type")  # Scripted, Documentary, Miniseries, Reality
        match.number_of_seasons = series_details.get("number_of_seasons")
        match.number_of_episodes = series_details.get("number_of_episodes")
        match.networks = [n["name"] for n in series_details.get("networks", [])]
        
        loc = self._get_or_create_loc(match, language)
        loc.series_title = series_details.get("name")
        loc.original_series_title = series_details.get("original_name")
        loc.overview = series_details.get("overview")
        loc.series_poster_path = series_details.get("poster_path") # Fő sorozat poszter
        loc.poster_path = series_details.get("poster_path") # Default (ha nincs szezon poszter)
        loc.backdrop_path = series_details.get("backdrop_path")
        loc.genres = [g["name"] for g in series_details.get("genres", [])]
        loc.origin_country = series_details.get("origin_country")

        # B. SZEZON SZINT (Ha van szezon szám)
        if match.season_number is not None:
            seasons = series_details.get("seasons", [])
            season_data = next((s for s in seasons if s.get("season_number") == match.season_number), None)
            
            if season_data:
                loc.season_title = season_data.get("name")
                loc.overview = season_data.get("overview") or loc.overview
                match.season_tmdb_id = season_data.get("id")
                match.episode_count = season_data.get("episode_count")
                # Szezon air date
                s_date = season_data.get("air_date")
                if s_date:
                    try:
                        from datetime import datetime
                        match.season_air_date = datetime.strptime(s_date, "%Y-%m-%d")
                    except: pass
                
                # Ha van szezon poszter, az kerül az elsődleges poszter helyére
                if season_data.get("poster_path"):
                    loc.poster_path = season_data.get("poster_path")

        # C. EPIZÓD SZINT (Ha van epizód szám)
        if match.season_number is not None and match.episode_number is not None:
            ep_details = self.api.get_episode_details(
                match.tmdb_id, match.season_number, match.episode_number, language=language
            )
            if ep_details:
                loc.episode_title = ep_details.get("name")
                loc.overview = ep_details.get("overview") or loc.overview
                match.rating_tmdb = ep_details.get("vote_average")
                match.vote_count_tmdb = ep_details.get("vote_count")
                match.runtime = ep_details.get("runtime") or match.runtime
                # Epizód air date
                ep_date = ep_details.get("air_date")
                if ep_date:
                    try:
                        from datetime import datetime
                        match.episode_air_date = datetime.strptime(ep_date, "%Y-%m-%d")
                    except: pass
                # Epizód kép
                if ep_details.get("still_path"):
                    loc.backdrop_path = ep_details.get("still_path")
                
                # EPIZÓD SZINTŰ IMDb (OMDb hívás az epizód ID-jával)
                ep_ext_ids = ep_details.get("external_ids", {})
                ep_imdb_id = ep_ext_ids.get("imdb_id")
                if ep_imdb_id:
                    self._update_omdb_ratings(match, ep_imdb_id)

    def _update_match_common(self, match: MediaMatch, details: Dict[str, Any]):
        """Közös adatok frissítése (időtartam, értékelések, személyek)."""
        runtimes = details.get("episode_run_time", [])
        match.runtime = details.get("runtime") or (runtimes[0] if runtimes else None)
        match.popularity = details.get("popularity")
        match.rating_tmdb = details.get("vote_average")
        match.vote_count_tmdb = details.get("vote_count")
        
        # IMDb ID (Series/Movie szintű)
        ext_ids = details.get("external_ids", {})
        imdb_id = ext_ids.get("imdb_id") or match.imdb_id
        match.imdb_id = imdb_id

        # Nyelvek és Országok
        match.original_language = details.get("original_language")
        match.origin_country = details.get("origin_country")
        spoken = details.get("spoken_languages", [])
        if spoken:
            match.spoken_languages = [s["iso_639_1"] for s in spoken]

        # OMDb Értékelések
        if imdb_id:
            self._update_omdb_ratings(match, imdb_id)

        # SZEMÉLYEK FELDOLGOZÁSA
        self._process_people(match, details)

    def _update_omdb_ratings(self, match: MediaMatch, imdb_id: str):
        """Lekéri és frissíti az OMDb értékeléseket."""
        omdb_data = self.omdb.get_ratings(imdb_id)
        if omdb_data:
            try:
                val = omdb_data["imdb_rating"]
                match.rating_imdb = float(val) if val and val != "N/A" else match.rating_imdb
            except: pass
            
            try:
                votes_str = omdb_data["imdb_votes"].replace(",", "")
                match.vote_count_imdb = int(votes_str) if votes_str and votes_str != "N/A" else match.vote_count_imdb
            except: pass
            
            match.rating_rotten = omdb_data["rotten_tomatoes"] or match.rating_rotten
            try:
                m_val = omdb_data["metascore"]
                match.rating_meta = int(m_val) if m_val and m_val != "N/A" else match.rating_meta
            except: pass

    def _process_people(self, match: MediaMatch, details: Dict[str, Any]):
        """Kinyeri és összeköti a stábtagokat és színészeket."""
        from ..db.models import Person, MediaPersonLink
        
        credits = details.get("credits", {})
        cast = credits.get("cast", [])[:20] # Top 20 színész
        crew = credits.get("crew", [])
        
        # 1. Rendezők / Készítők
        creators = []
        if match.item_type == ItemType.MOVIE:
            creators = [p for p in crew if p["job"] == "Director"]
        else:
            # Sorozatoknál 'created_by'
            creators = details.get("created_by", [])
            # Ha nincs created_by, akkor a crew-ból a Producerek
            if not creators:
                creators = [p for p in crew if p["job"] in ["Executive Producer", "Director"]]

        # Mentés és Linkelés
        processed_people = [] # ID-k a duplikáció elkerülésére egy elemen belül
        
        # A. Készítők feldolgozása
        for i, p in enumerate(creators[:5]):
            person = self._get_or_create_person(p)
            self._link_person(match, person, job="Director" if match.item_type == ItemType.MOVIE else "Creator")
            processed_people.append(p["id"])
            if i == 0: match.director = p["name"]

        # B. Színészek feldolgozása
        for i, p in enumerate(cast):
            if p["id"] in processed_people: continue
            person = self._get_or_create_person(p)
            self._link_person(match, person, job="Actor", character=p.get("character"), order=i)
            processed_people.append(p["id"])

    def _get_or_create_person(self, p_data: Dict[str, Any]) -> "Person":
        from ..db.models import Person
        tmdb_id = p_data["id"]
        person = self.db.query(Person).filter(Person.id == tmdb_id).first()
        if not person:
            person = Person(
                id=tmdb_id,
                popularity=p_data.get("popularity"),
                profile_path=p_data.get("profile_path")
            )
            self.db.add(person)
            # Alap lokalizáció (név)
            from ..db.models import PersonLocalization
            loc = PersonLocalization(person_id=tmdb_id, language="en", name=p_data["name"])
            self.db.add(loc)
        return person

    def _link_person(self, match: MediaMatch, person: "Person", job: str, character: str = None, order: int = 0):
        from ..db.models import MediaPersonLink
        link = self.db.query(MediaPersonLink).filter(
            MediaPersonLink.media_match_id == match.id,
            MediaPersonLink.person_id == person.id,
            MediaPersonLink.job == job
        ).first()
        if not link:
            link = MediaPersonLink(
                media_match_id=match.id,
                person_id=person.id,
                job=job,
                character_name=character,
                order=order
            )
            self.db.add(link)

    def _get_or_create_loc(self, match: MediaMatch, language: str) -> MetadataLocalization:
        """Lokalizációs objektum kérése vagy létrehozása."""
        loc = self.db.query(MetadataLocalization).filter(
            MetadataLocalization.match_id == match.id,
            MetadataLocalization.language == language
        ).first()
        if not loc:
            loc = MetadataLocalization(match_id=match.id, language=language)
            self.db.add(loc)
        return loc
