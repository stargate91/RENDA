import re
from typing import List, Dict, Any, Set
from datetime import datetime
from sqlalchemy.orm import Session, backref
from ..db.models import MediaItem, MediaMatch, MetadataLocalization, ItemStatus, ItemType
from ..api.tmdb_client import TMDBClient

class Resolver:
    """
    A "Bíró", aki eldönti, hogy egy MediaItem melyik TMDB találatnak felel meg.
    """

    def __init__(self, db_session: Session):
        self.db = db_session
        self.api = TMDBClient(db_session)

    def propagate_match(self, source_item: MediaItem):
        """
        Átmásolja az aktív találatot az azonos group_hash-el rendelkező többi fájlra.
        """
        if not source_item.group_hash:
            return

        active_match = next((m for m in source_item.matches if m.is_active), None)
        if not active_match:
            return

        # Keressük meg a többi fájlt ugyanazzal a hash-el
        siblings = self.db.query(MediaItem).filter(
            MediaItem.group_hash == source_item.group_hash,
            MediaItem.id != source_item.id
        ).all()

        for sib in siblings:
            # Töröljük a régi találatokat nála is
            self.db.query(MediaMatch).filter(MediaMatch.media_item_id == sib.id).delete()
            
            # Új találat létrehozása (másolat az aktívról)
            new_match = MediaMatch(
                media_item_id=sib.id,
                tmdb_id=active_match.tmdb_id,
                item_type=active_match.item_type,
                # Fontos: a saját epizód/szezon számait használja, ha vannak!
                season_number=sib.fn_season or sib.fd_season or active_match.season_number,
                episode_number=sib.fn_episode or sib.fd_episode or active_match.episode_number,
                release_date=active_match.release_date,
                first_air_date=active_match.first_air_date,
                confidence_score=active_match.confidence_score,
                is_active=True,
                rating_tmdb=active_match.rating_tmdb,
                vote_count_tmdb=active_match.vote_count_tmdb
            )
            self.db.add(new_match)
            self.db.flush()

            # Lokalizált adatok másolása is
            for loc in active_match.localizations:
                new_loc = MetadataLocalization(
                    match_id=new_match.id,
                    target_language=loc.target_language,
                    title=loc.title,
                    original_title=loc.original_title,
                    series_title=loc.series_title,
                    original_series_title=loc.original_series_title,
                    season_title=loc.season_title,
                    episode_title=loc.episode_title,
                    overview=loc.overview,
                    poster_path=loc.poster_path,
                    backdrop_path=loc.backdrop_path
                )
                self.db.add(new_loc)
            
            sib.status = ItemStatus.MATCHED
        
        self.db.commit()

    def _sanitize_query(self, query: str) -> str:
        """
        Eltávolítja a maradék sallangokat, amiket a Guessit esetleg benne hagyott.
        (Pl. Mini-Series, Complete)
        """
        if not query: return ""
        
        # Csak a legszükségesebb tisztítás
        clean_query = query
        
        # Specifikus kulcsszavak eltávolítása
        for word in ["Mini-Series", "Complete", "Season"]:
            clean_query = re.sub(rf"\b{word}\b", "", clean_query, flags=re.IGNORECASE)
            
        # Dupla szóközök takarítása
        return " ".join(clean_query.split()).strip()

    def resolve_item(self, item: MediaItem, language: str = "en"):
        """
        Végrehajtja a hármas keresést és elmenti a jelölteket.
        """
        candidates: Dict[int, Dict[str, Any]] = {} # tmdb_id -> raw_data

        # 1. Forrás: IMDb ID (Source of Truth)
        if item.nfo_imdb_id:
            res = self.api.find_by_imdb(item.nfo_imdb_id, language=language)
            if res:
                self._add_candidate(candidates, res)

        # 2. Forrás: Triple Guessit Search (ha még nincs 100%-os találatunk)
        if not candidates:
            search_tasks = [
                (item.it_title, item.it_year),
                (item.fn_title, item.fn_year),
                (item.fd_title, item.fd_year)
            ]
            
            for title, year in search_tasks:
                if not title: continue
                
                # Ha filmnek tűnik, de Guessit epizódot/részt talált, 
                # valószínűleg a cím része (pl. 28 Weeks Later, Apollo 11)
                # Ezt a ScannerManager-ben kellene ideális esetben kezelni, 
                # de a Resolver-ben is adunk neki egy esélyt.
                # Megjegyzés: itt most a már meglévő title-t használjuk.
                
                clean_title = self._sanitize_query(title)
                if not clean_title: continue

                tmdb_type = "tv" if item.item_type in (ItemType.SERIES, ItemType.EPISODE) else "movie"
                results = self.api.search(clean_title, item_type=tmdb_type, year=year, language=language)
                
                # FALLBACK: Ha évszámmal nem volt találat, próbáljuk meg anélkül
                if not results and year:
                    results = self.api.search(clean_title, item_type=tmdb_type, year=None, language=language)
                
                for res in results:
                    res["item_type"] = tmdb_type
                    self._add_candidate(candidates, res)

        # 3. Találatok mentése az adatbázisba
        self._save_matches(item, candidates, language)

    def _add_candidate(self, candidates: Dict[int, Dict[str, Any]], res: Dict[str, Any]):
        """Deduplikálva hozzáad egy jelöltet."""
        tmdb_id = res.get("id")
        if tmdb_id and tmdb_id not in candidates:
            candidates[tmdb_id] = res

    def _save_matches(self, item: MediaItem, candidates: Dict[int, Dict[str, Any]], language: str):
        """Elmenti a jelölteket (max 15) és frissíti az item státuszát."""
        # Régi találatok törlése
        self.db.query(MediaMatch).filter(MediaMatch.media_item_id == item.id).delete()
        
        if not candidates:
            item.status = ItemStatus.NO_MATCH
            self.db.commit()
            return

        # Sorbarendezzük népszerűség szerint (ha van ilyen adatunk a keresésből)
        sorted_candidates = sorted(candidates.values(), key=lambda x: x.get('popularity', 0), reverse=True)
        
        # Limitálás 15-re
        limited_candidates = sorted_candidates[:15]
        match_count = len(limited_candidates)
        
        for i, data in enumerate(limited_candidates):
            tmdb_id = data.get("id")
            
            # Dátumok kinyerése
            date_str = data.get("release_date") or data.get("first_air_date")
            release_date = None
            if date_str:
                try:
                    release_date = datetime.strptime(date_str, "%Y-%m-%d")
                except:
                    pass

            raw_type = data.get("item_type") or data.get("media_type", "movie")
            itype = ItemType.SERIES if raw_type in ["series", "tv"] else ItemType.MOVIE
            
            match = MediaMatch(
                media_item_id=item.id,
                tmdb_id=tmdb_id,
                item_type=itype,
                season_number=item.fn_season or item.fd_season or item.it_season,
                episode_number=item.fn_episode or item.fd_episode or item.it_episode,
                release_date=release_date if itype == ItemType.MOVIE else None,
                first_air_date=release_date if itype == ItemType.SERIES else None,
                confidence_score=1.0,
                rating_tmdb=data.get("vote_average"),
                vote_count_tmdb=data.get("vote_count")
            )
            
            # Első találat (legnépszerűbb) lesz az aktív (alapból)
            if i == 0:
                target_year = item.fn_year or item.fd_year or item.it_year
                match_year = release_date.year if release_date else None
                
                has_season = bool(item.fn_season or item.fd_season or item.it_season)
                has_episode_num = bool(item.fn_episode or item.fd_episode or item.it_episode)
                
                tmdb_title = data.get("title") or data.get("name")
                parsed_title = item.fn_title or item.fd_title or item.it_title
                is_exact_title = False
                if tmdb_title and parsed_title and tmdb_title.lower().strip() == parsed_title.lower().strip():
                    is_exact_title = True
                
                # 1. Kritérium: Ha sorozat, de hiányzik a szezon VAGY epizód szám -> UNCERTAIN
                if item.item_type in (ItemType.SERIES, ItemType.EPISODE) and (not has_season or not has_episode_num):
                    item.status = ItemStatus.UNCERTAIN
                    match.is_active = True
                    
                # Új kritérium: Ha sorozat/epizód, a cím PONTOSAN megegyezik, és van S/E -> MATCHED
                # Ezzel elkerüljük, hogy évszámnak tűnő epizódcímek (pl. "1969") miatt UNCERTAIN legyen
                elif item.item_type in (ItemType.SERIES, ItemType.EPISODE) and is_exact_title and has_season and has_episode_num:
                    item.status = ItemStatus.MATCHED
                    match.is_active = True
                    
                # 2. Van évszámunk, és az első találat évszáma is megegyezik (+- 1 év)
                elif target_year and match_year and abs(target_year - match_year) <= 1:
                    item.status = ItemStatus.MATCHED
                    match.is_active = True
                
                # 3. Van évszámunk, de az első találat évszáma eltér
                elif target_year and match_year and abs(target_year - match_year) > 1:
                    item.status = ItemStatus.UNCERTAIN
                    match.is_active = True
                    
                # 4. Nincs évszámunk, de a TMDB több találatot is adott
                elif not target_year and match_count > 1:
                    item.status = ItemStatus.MULTIPLE
                    match.is_active = False  # NO active match for multiple
                    item.planned_path = None # Clear any planned path
                    
                # 5. Nincs évszám, de csak 1 találat jött vissza (egyértelmű match)
                else:
                    item.status = ItemStatus.MATCHED
                    match.is_active = True
            
            self.db.add(match)
            self.db.flush()

            # Lokalizált adatok (alap keresési válaszból)
            loc = MetadataLocalization(
                match_id=match.id,
                target_language=language,
                title=data.get("title") or data.get("name"),
                overview=data.get("overview"),
                poster_path=data.get("poster_path"),
                backdrop_path=data.get("backdrop_path")
            )
            self.db.add(loc)

        self.db.commit()
