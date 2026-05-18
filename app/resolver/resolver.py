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

        # Szezon-alapú támogatás validálása sorozatokhoz
        def filter_by_season_support(tv_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            target_season = item.fn_season or item.fd_season or item.it_season
            if not target_season:
                return tv_results
            
            valid = []
            for res in tv_results:
                res_id = res.get("id")
                if not res_id: continue
                # Details TMDB call (cached)
                details = self.api.get_details(res_id, "tv", language=language)
                if details:
                    num_seasons = details.get("number_of_seasons") or 0
                    if num_seasons >= target_season:
                        valid.append(res)
                    else:
                        from ..utils.logger import logger
                        logger.info(f"Skipping TV series candidate '{res.get('name') or res.get('original_name')}' (ID: {res_id}) because it only has {num_seasons} seasons, but file has season {target_season}")
                else:
                    # Ha nincs details (pl. API hiba), megtartjuk biztonsági okokból
                    valid.append(res)
            return valid

        # 1. Forrás: IMDb ID (Source of Truth)
        if item.nfo_imdb_id:
            res = self.api.find_by_imdb(item.nfo_imdb_id, language=language)
            if res:
                if res.get("item_type") == "tv":
                    res_list = filter_by_season_support([res])
                    if res_list:
                        self._add_candidate(candidates, res)
                else:
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
                if tmdb_type == "tv":
                    results = filter_by_season_support(results)
                
                # FALLBACK 1: Ha évszámmal nem volt találat, próbáljuk meg anélkül
                if not results and year:
                    results = self.api.search(clean_title, item_type=tmdb_type, year=None, language=language)
                    if tmdb_type == "tv":
                        results = filter_by_season_support(results)
                
                # FALLBACK 2: Ha még mindig nincs találat, és a cím végén gyanús, törtből származó számcsoport van (pl. '2 12' -> '2')
                if not results:
                    fallback_match = re.search(r'^(.*\b\d+)\s+\d+$', clean_title)
                    if fallback_match:
                        fallback_title = fallback_match.group(1).strip()
                        results = self.api.search(fallback_title, item_type=tmdb_type, year=year, language=language)
                        if tmdb_type == "tv":
                            results = filter_by_season_support(results)
                        if not results and year:
                            results = self.api.search(fallback_title, item_type=tmdb_type, year=None, language=language)
                            if tmdb_type == "tv":
                                results = filter_by_season_support(results)
                
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
            item.planned_path = None
            self.db.commit()
            return

        target_year = item.fn_year or item.fd_year or item.it_year
        
        def get_candidate_score(x):
            popularity = x.get('popularity', 0) or 0
            date_str = x.get("release_date") or x.get("first_air_date")
            year_match = 0
            if target_year and date_str:
                try:
                    c_year = int(date_str.split("-")[0])
                    if abs(c_year - target_year) <= 1:
                        year_match = 1
                except:
                    pass
            return (year_match, popularity)

        # Sorbarendezzük: elsődlegesen évszám egyezése szerint (+-1 év), másodlagosan népszerűség szerint
        sorted_candidates = sorted(candidates.values(), key=get_candidate_score, reverse=True)
        
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
                
                parsed_title = item.fn_title or item.fd_title or item.it_title
                
                # Összegyűjtjük a TMDB találat lehetséges nyelvi címeit közvetlenül a keresési találatból (alap és eredeti címek)
                all_titles = []
                if data.get("title"): all_titles.append(data.get("title"))
                if data.get("name"): all_titles.append(data.get("name"))
                if data.get("original_title"): all_titles.append(data.get("original_title"))
                if data.get("original_name"): all_titles.append(data.get("original_name"))
                
                # Lekérjük a részletes adatokat a gyorsítótárból a fordításokért
                details = self.api.get_details(tmdb_id, "tv" if itype == ItemType.SERIES else "movie", language=language)
                if details:
                    # Alternatív címek a részletekből
                    alt_titles_data = details.get("alternative_titles", {}).get("results", []) or details.get("alternative_titles", {}).get("titles", [])
                    if isinstance(alt_titles_data, list):
                        for alt in alt_titles_data:
                            if alt.get("title"): all_titles.append(alt.get("title"))
                            if alt.get("name"): all_titles.append(alt.get("name"))
                            
                    # Fordítások a részletekből
                    translations = details.get("translations", {}).get("translations", [])
                    if isinstance(translations, list):
                        for trans in translations:
                            t_data = trans.get("data", {})
                            if t_data.get("name"): all_titles.append(t_data.get("name"))
                            if t_data.get("title"): all_titles.append(t_data.get("title"))
                
                def clean_title(t: str) -> str:
                    if not t: return ""
                    return re.sub(r'[^a-z0-9]', '', t.lower())
                
                is_exact_title = False
                cleaned_parsed = clean_title(parsed_title)
                if cleaned_parsed:
                    for title in all_titles:
                        if clean_title(title) == cleaned_parsed:
                            is_exact_title = True
                            break
                
                # 1. Kritérium: Ha sorozat, de hiányzik a szezon VAGY epizód szám -> UNCERTAIN
                if item.item_type in (ItemType.SERIES, ItemType.EPISODE) and (not has_season or not has_episode_num):
                    item.status = ItemStatus.UNCERTAIN
                    match.is_active = True
                    item.planned_path = None
                    
                # Új kritérium: Ha a cím PONTOSAN megegyezik (írásjelektől eltekintve)
                # Sorozat esetén: ha van S/E -> MATCHED (elkerüli a hamis évszám és a többes találat miatti bizonytalanságot)
                # Film esetén: ha a cím pontosan egyezik, akkor is MATCHED!
                elif is_exact_title and (item.item_type not in (ItemType.SERIES, ItemType.EPISODE) or (has_season and has_episode_num)):
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
                    item.planned_path = None
                    
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
