import re
from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from pathlib import Path
from ..db.models import MediaMatch, ItemType


class Casing(Enum):
    """Névformázási stílus."""
    LOWER = "lower"        # the matrix
    UPPER = "upper"        # THE MATRIX
    TITLE = "title"        # The Matrix
    DEFAULT = "default"    # Ahogy az API adja (változatlan)


class Separator(Enum):
    """Elválasztó karakter a szavak között."""
    SPACE = " "            # The Matrix
    DOT = "."              # The.Matrix
    DASH = "-"             # The-Matrix
    UNDERSCORE = "_"       # The_Matrix


# Római számok konverziója
_ROMAN_NUMERALS = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
    (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")
]


def to_roman(num: int) -> str:
    """Szám → római szám."""
    if num <= 0: return str(num)
    result = ""
    for value, numeral in _ROMAN_NUMERALS:
        while num >= value:
            result += numeral
            num -= value
    return result


def to_alpha(num: int) -> str:
    """Szám → nagybetű. 1=A, 2=B, ..., 26=Z, 27=AA."""
    if num <= 0: return str(num)
    result = ""
    while num > 0:
        num -= 1
        result = chr(65 + num % 26) + result
        num //= 26
    return result


class ExtraOrg(Enum):
    """Extra fájlok rendszerezési módja."""
    SAME_FOLDER = "same_folder"          # Közvetlenül a szülő mellett
    SUBFOLDER = "subfolder"              # Egy közös mappában (pl. Extras/)
    CATEGORY_FOLDERS = "category_folders" # Kategóriánkénti mappákban (pl. Images/, Subtitles/)


@dataclass
class FormatterConfig:
    """Formatter beállítások."""
    casing: Casing = Casing.DEFAULT
    separator: Separator = Separator.SPACE
    zero_pad: bool = True  # S01E03 vs S1E3
    custom_text: str = ""  # {custom} változó értéke (Settingsből)

    # Kategória mappák (Filmek/Sorozatok külön)
    use_categories: bool = False
    movies_category_name: str = "Movies"
    series_category_name: str = "Series"

    # Extra rendszerezés
    extra_org: ExtraOrg = ExtraOrg.SAME_FOLDER
    extras_subfolder_name: str = "Extras" # Csak SUBFOLDER módnál

    # Alapértelmezett extra template
    extra_file: str = "{parent_name}-{sub_category}"

    # Alapértelmezett film templatek
    movie_folder: str = "{title} ({year})"
    movie_file: str = "{title} ({year})"
    collection_folder: str = "{collection}"

    # Alapértelmezett TV templatek
    series_folder: str = "{series_title} ({first_air_year})"
    season_folder: str = "Season {season}"
    episode_file: str = "{series_title} - S{season}E{episode} - {episode_title}"


@dataclass
class RenamePreview:
    """Átnevezési előnézet egy fájlhoz."""
    item_id: int
    original_path: str
    target_name: str      # Csak a fájlnév
    target_subpath: str   # Kategória/Sorozat/Szezon mappa struktúra
    item_type: str        # 'movie', 'series', 'episode', 'extra'
    destination_root: str = ""
    extra_id: Optional[int] = None # Csak extráknál
    has_collision: bool = False
    collision_group_id: Optional[str] = None # Azonos ID az ütköző fájloknak
    extra_previews: List['RenamePreview'] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    @property
    def target_path(self) -> str:
        """Teljes célútvonal."""
        return str(Path(self.destination_root) / self.target_subpath / self.target_name)

    @property
    def is_too_long(self) -> bool:
        """Windows MAX_PATH (260) check."""
        return len(self.target_path) >= 260


class Formatter:
    """
    Generator for standardized file and directory names.
    Handles template rendering, illegal character stripping, and collision resolution.
    """

    ILLEGAL_CHARS = re.compile(r'[\\/:*?"<>|]')
    MULTI_SPACE = re.compile(r'\s{2,}')
    TEMPLATE_VAR = re.compile(r'\{(\w+)\}')

    def __init__(self, config: Optional[FormatterConfig] = None):
        self.config = config or FormatterConfig()

    def plan_rename(self, match: MediaMatch, destination_root: str) -> RenamePreview:
        """
        Generates a comprehensive renaming plan for a media item and all its extras.
        Validates path lengths and resolves potential filename collisions.
        """
        item = match.media_item
        loc = next((l for l in match.localizations if l.is_primary), match.localizations[0])
        
        # 1. Context építés
        if match.item_type == ItemType.MOVIE:
            context = self.build_movie_context(item, match, loc)
            target_name = self.format_movie_filename(context)
            # Mappa struktúra (pl. Movies/Matrix (1999))
            cat_folder = self.get_category_folder("movie")
            folder_name = self.format_movie_foldername(context)
            target_subpath = str(Path(cat_folder) / folder_name)
        else:
            # Sorozat/Epizód (egyelőre epizód fókuszú)
            context = self.build_tv_context(item, match, loc)
            target_name = self.format_episode_filename(context)
            # Mappa: Series/The Last of Us (2023)/Season 01
            cat_folder = self.get_category_folder("series")
            series_folder = self.format_series_foldername(context)
            season_folder = self.format_season_foldername(context)
            target_subpath = str(Path(cat_folder) / series_folder / season_folder)

        # 2. Fő preview létrehozása
        main_preview = RenamePreview(
            item_id=item.id,
            original_path=item.current_path,
            target_name=target_name,
            target_subpath=target_subpath,
            item_type=match.item_type.value,
            destination_root=destination_root
        )

        # 3. Extrák tervezése
        parent_name_no_ext = target_name.rsplit(".", 1)[0]
        for extra in item.extras:
            extra_ctx = self.build_extra_context(extra, parent_name_no_ext)
            extra_name = self.format_extra_filename(extra_ctx)
            extra_sub = self.get_extra_subpath(extra)
            
            # Az extrák a szülő mappájába kerülnek (target_subpath) + opcionális extra_sub
            final_extra_sub = str(Path(target_subpath) / extra_sub)
            
            main_preview.extra_previews.append(RenamePreview(
                item_id=extra.id,
                original_path=extra.current_path,
                target_name=extra_name,
                target_subpath=final_extra_sub,
                item_type="extra",
                destination_root=destination_root,
                extra_id=extra.id
            ))

        # 4. Ütközések feloldása
        self.resolve_collisions([main_preview])

        # 5. Útvonalhossz ellenőrzés
        self._check_path_lengths(main_preview)

        return main_preview

    def _check_path_lengths(self, preview: RenamePreview):
        """Rekurzívan ellenőrzi az útvonalhosszokat és figyelmeztetést ad."""
        if preview.is_too_long:
            preview.warnings.append(f"Path exceeds Windows limit ({len(preview.target_path)}/260 chars)")
        
        for ep in preview.extra_previews:
            self._check_path_lengths(ep)

    def resolve_collisions(self, previews: List[RenamePreview]) -> List[RenamePreview]:
        """
        Észleli az ütközéseket és automatikusan sorszámozza az extrákat.
        Módosítja a 'previews' listát helyben.
        """
        # 1. Kilapítjuk a listát, hogy az extrák is benne legyenek a közös kalapban
        all_to_check: List[RenamePreview] = []
        for p in previews:
            all_to_check.append(p)
            all_to_check.extend(p.extra_previews)

        # 2. Csoportosítás teljes célútvonal alapján
        path_map: Dict[str, List[RenamePreview]] = {}
        for p in all_to_check:
            full_path = p.target_path.lower()
            if full_path not in path_map:
                path_map[full_path] = []
            path_map[full_path].append(p)

        # 3. Ütközések feloldása
        for full_path, items in path_map.items():
            if len(items) > 1:
                # Van ütközés!
                
                # A. EXTRÁK: Automatikus sorszámozás
                if all(i.item_type == "extra" for i in items):
                    for idx, item in enumerate(items, 1):
                        # Beszúrjuk a sorszámot a kiterjesztés elé
                        name_parts = item.target_name.rsplit(".", 1)
                        if len(name_parts) == 2:
                            item.target_name = f"{name_parts[0]} {idx}.{name_parts[1]}"
                        else:
                            item.target_name = f"{item.target_name} {idx}"
                
                # B. FŐ MÉDIA: Csak flageljük
                else:
                    group_id = f"coll_{len(full_path)}" # Egyszerű ID az UI-nak
                    for item in items:
                        item.has_collision = True
                        item.collision_group_id = group_id
        
        return previews

    # =========================================================================
    # Publikus API - Filmek
    # =========================================================================

    def format_movie_filename(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.movie_file, context)

    def format_movie_foldername(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.movie_folder, context)

    def format_collection_foldername(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.collection_folder, context)

    # =========================================================================
    # Publikus API - Sorozatok
    # =========================================================================

    def format_series_foldername(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.series_folder, context)

    def format_season_foldername(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.season_folder, context)

    def format_episode_filename(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.episode_file, context)

    def format_extra_filename(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.extra_file, context)

    def get_extra_subpath(self, extra) -> str:
        """Visszaadja az extra fájl alkönyvtárát a stratégia alapján."""
        if self.config.extra_org == ExtraOrg.SAME_FOLDER:
            return ""
        
        if self.config.extra_org == ExtraOrg.SUBFOLDER:
            return self.config.extras_subfolder_name
        
        if self.config.extra_org == ExtraOrg.CATEGORY_FOLDERS:
            # Pl. 'Images', 'Subtitles'
            return extra.category or "Other"
        
        return ""

    def build_extra_context(self, extra, parent_formatted_name: str) -> Dict[str, Any]:
        """
        Összegyűjti a változókat egy extra fájlhoz.
        parent_formatted_name: A szülő fájl neve kiterjesztés NÉLKÜL.
        """
        # subtype finomítás
        sub_cat = extra.subtype.value if extra.subtype else ""
        # Ha Metadata és a sub_cat megegyezik a kiterjesztéssel, akkor üres legyen
        if extra.category == "Metadata" and sub_cat.lower() == (extra.extension or "").lower().strip("."):
            sub_cat = ""

        return {
            "parent_name": parent_formatted_name,
            "category": extra.category.value if extra.category else "",
            "sub_category": sub_cat,
            "language": extra.language or "",
            "ext": extra.extension or "",
            "custom": self.config.custom_text
        }

    def get_category_folder(self, item_type_value: str) -> str:
        """Visszaadja a kategória-mappa nevét (Movies/Series), ha be van kapcsolva."""
        if not self.config.use_categories:
            return ""
        
        if item_type_value == "movie":
            return self.config.movies_category_name
        if item_type_value in ["series", "episode"]:
            return self.config.series_category_name
        return ""

    # =========================================================================
    # Context Builderek
    # =========================================================================

    def build_movie_context(self, item, match, loc) -> Dict[str, Any]:
        """Összegyűjti a változókat egy filmhez."""
        from ..db.models import PartType, PartStyle
        ctx = self._build_common_tech_context(item)
        
        # Alap metaadatok
        ctx.update({
            "title": loc.title or "",
            "original_title": loc.original_title or "",
            "year": str(match.release_date.year) if match.release_date else "",
            "release_date": match.release_date.strftime("%Y-%m-%d") if match.release_date else "",
            "director": match.director or "",
            "imdb_id": match.imdb_id or "",
            "tmdb_id": str(match.tmdb_id) if match.tmdb_id else "",
            "rating_imdb": str(match.rating_imdb) if match.rating_imdb else "",
            "collection": match.collection or "",
            "edition": self._format_enum_val(item.edition),
            "audio_type": self._format_enum_val(item.audio_type),
            "source": self._format_source(item.source),
            "custom": self.config.custom_text,
            "ext": item.extension or "",
        })

        # Part kezelés
        part_label, part_val = self._build_part_info(item)
        ctx["part_type"] = part_label
        ctx["part"] = part_val

        return ctx

    def build_tv_context(self, item, match, loc, children: List[Any] = None) -> Dict[str, Any]:
        """
        Összegyűjti a változókat sorozathoz / szezonhoz / epizódhoz.
        children: a mappában lévő MediaItem-ek a technikai statisztikához (mixed felbontás).
        """
        ctx = self._build_common_tech_context(item)
        
        # Ha mappáról van szó (series/season), felülbíráljuk a felbontást a mixed logikával
        if children:
            ctx["resolution"] = self._calculate_mixed_resolution(children)

        # Sorozat/Szezon/Epizód közös meta
        ctx.update({
            # Series szint
            "series_title": loc.series_title or "",
            "series_original_title": loc.original_series_title or "",
            "series_tmdb_id": str(match.series_tmdb_id or match.tmdb_id),
            "series_imdb_id": match.imdb_id or "",
            "series_imdb_rating": str(match.rating_imdb) if match.rating_imdb else "",
            "number_of_seasons": str(match.number_of_seasons or ""),
            "number_of_episodes": str(match.number_of_episodes or ""),
            "first_air_date": match.first_air_date.strftime("%Y-%m-%d") if match.first_air_date else "",
            "first_air_year": str(match.first_air_date.year) if match.first_air_date else "",
            "year": str(match.first_air_date.year) if match.first_air_date else "", # Alias
            "last_air_date": "",
            "last_air_year": "",
            "series_status": match.release_status or "",
            "series_type": match.series_type or "",
            "director": match.director or "",
            "networks": ", ".join(match.networks) if match.networks else "",

            # Season szint
            "season": self.format_number(match.season_number),
            "season_title": loc.season_title or "",
            "season_tmdb_id": str(match.season_tmdb_id or ""),
            "episode_count": str(match.episode_count or ""),
            "season_air_date": match.season_air_date.strftime("%Y-%m-%d") if match.season_air_date else "",
            "season_air_year": str(match.season_air_date.year) if match.season_air_date else "",

            # Episode szint
            "episode": self.format_number(match.episode_number),
            "episode_title": loc.episode_title or "",
            "episode_original_title": loc.original_title or "", # Episode original title
            "episode_tmdb_id": str(match.tmdb_id) if match.item_type.value == "episode" else "",
            "episode_imdb_id": match.imdb_id if match.item_type.value == "episode" else "",
            "episode_air_date": match.episode_air_date.strftime("%Y-%m-%d") if match.episode_air_date else "",
            "episode_air_year": str(match.episode_air_date.year) if match.episode_air_date else "",

            "custom": self.config.custom_text,
            "ext": item.extension or "",
        })

        # Intelligens last_air dátum kezelés
        if match.release_status in ["Ended", "Canceled"] and match.last_air_date:
            l_year = str(match.last_air_date.year)
            # Csak akkor rakjuk be, ha nem ugyanaz az év, mint a kezdés (pl. minisorozat)
            if l_year != ctx.get("first_air_year"):
                ctx["last_air_date"] = match.last_air_date.strftime("%Y-%m-%d")
                ctx["last_air_year"] = l_year


        # Part kezelés (ritka de lehet epizódban is)
        part_label, part_val = self._build_part_info(item)
        ctx["part_type"] = part_label
        ctx["part"] = part_val

        return ctx

    # =========================================================================
    # Segédfüggvények
    # =========================================================================

    def _build_common_tech_context(self, item) -> Dict[str, Any]:
        return {
            "resolution": item.resolution or "",
            "video_codec": item.video_codec or "",
            "audio_codec": item.audio_codec or "",
            "channels": item.audio_channels or "",
            "bit_depth": f"{item.bit_depth}bit" if item.bit_depth else "",
            "hdr": item.hdr_type or "",
        }

    def _build_part_info(self, item) -> (str, str):
        from ..db.models import PartType, PartStyle
        label = ""
        val = ""
        if item.part is not None:
            if item.part_type and item.part_type != PartType.NONE:
                label = item.part_type.value
            if item.part_style == PartStyle.ROMAN:
                val = to_roman(item.part)
            elif item.part_style == PartStyle.ALPHA:
                val = to_alpha(item.part)
            else:
                val = str(item.part)
        return label, val

    def _format_enum_val(self, enum_obj) -> str:
        if not enum_obj or enum_obj.value == "none": return ""
        return enum_obj.value.replace("_", " ").title().replace("Directors Cut", "Director's Cut")

    def _format_source(self, source_enum) -> str:
        if not source_enum or source_enum.value == "none": return ""
        val = source_enum.value.upper()
        if val == "BLURAY": return "BluRay"
        if val == "WEB": return "WEB-DL"
        return val

    def _calculate_mixed_resolution(self, items: List[Any]) -> str:
        """Kiszámítja a mappára jellemző felbontást (min-max vagy Mixed)."""
        res_list = sorted(list(set(i.resolution for i in items if i.resolution)), 
                         key=lambda x: int(x.replace('p','').replace('K','000')) if 'p' in x else 0)
        if not res_list: return ""
        if len(res_list) == 1: return res_list[0]
        if len(res_list) == 2: return f"{res_list[0]}-{res_list[1]}"
        return "Mixed"

    def _render(self, template: str, context: Dict[str, Any]) -> str:
        """Rendereli a template-et, és automatikusan hozzáadja a kiterjesztést, ha fájlról van szó."""
        # 1. Behelyettesítés
        result = self.TEMPLATE_VAR.sub(lambda m: context.get(m.group(1), ""), template)
        
        # 2. Üres zárójelek/maradványok takarítása
        result = re.sub(r'\(\s*\)', '', result)
        result = re.sub(r'\[\s*\]', '', result)
        result = re.sub(r'\s*-\s*$', '', result)
        result = re.sub(r'^\s*-\s*', '', result)
        result = self.sanitize(result)

        # 3. Casing és Separator alkalmazása (csak a névre, a kiterjesztésre nem!)
        result = self.apply_casing(result)
        result = self.apply_separator(result)

        # 4. Automatikus kiterjesztés hozzáadása, ha fájlról van szó
        ext = context.get("ext", "")
        if ext and not result.lower().endswith(ext.lower()):
            result = f"{result}{ext}"

        return result.strip()

    def apply_casing(self, text: str) -> str:
        if not text: return ""
        if self.config.casing == Casing.LOWER: return text.lower()
        if self.config.casing == Casing.UPPER: return text.upper()
        if self.config.casing == Casing.TITLE: return text.title()
        return text

    def apply_separator(self, text: str) -> str:
        if not text: return ""
        sep = self.config.separator.value
        normalized = self.MULTI_SPACE.sub(" ", text.strip())
        return normalized.replace(" ", sep) if sep != " " else normalized

    def format_number(self, num, width: int = 2) -> str:
        try: n = int(num)
        except: return str(num) if num else ""
        return str(n).zfill(width) if self.config.zero_pad else str(n)

    def sanitize(self, text: str) -> str:
        if not text: return ""
        return self.MULTI_SPACE.sub(" ", self.ILLEGAL_CHARS.sub("", text)).strip(". ")
