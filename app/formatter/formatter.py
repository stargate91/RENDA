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

    # Naming Templates (from Settings)
    movie_file: str = "{title} ({year}) {resolution}"
    episode_file: str = "{series_title} - S{season}E{episode} - {episode_title}"
    
    # Part Formatting
    part_keyword: str = "Part"
    part_numbering: str = "numeric" # numeric, roman, alpha
    part_separator: Separator = Separator.SPACE

    # Folder Organization
    org_enabled: bool = True
    move_to_library: bool = True
    library_path: str = ""
    sort_by_type: bool = True
    movies_dir_name: str = "Movies"
    series_dir_name: str = "TV Shows"
    
    # Folder Templates
    create_movie_subdir: bool = True
    movie_folder: str = "{title} ({year})"
    create_collection_dir: bool = True
    collection_folder: str = "{collection}"
    create_series_dir: bool = True
    series_folder: str = "{series_title} ({year})"
    create_season_dir: bool = True
    season_folder: str = "Season {season}"
    create_episode_dir: bool = False
    episode_folder: str = "{series_title} - {season}{episode}"
    
    remove_empty: bool = True
    
    # Extras Handling
    extras_enabled: bool = True
    # Actions: 'rename', 'delete', 'ignore'
    extra_video_action: str = "rename"
    extra_sub_action: str = "rename"
    extra_audio_action: str = "rename"
    extra_img_action: str = "rename"
    extra_meta_action: str = "rename"
    
    # Extras Templates
    extra_video_template: str = "{parent_name}-{sub_category}"
    extra_sub_template: str = "{parent_name}.{language}"
    extra_audio_template: str = "{parent_name}.{language}"
    extra_img_template: str = "{sub_category}"
    extra_meta_template: str = "{parent_name}"
    
    # Extras Folder Placement
    # modes: 'subfolder' (into 'Extras'), 'flat' (next to media)
    extras_folder_mode: str = "subfolder"
    extras_subfolder_name: str = "Extras"

    @staticmethod
    def from_db(db_session) -> 'FormatterConfig':
        from ..db.models import UserSetting
        config = FormatterConfig()
        try:
            settings = {s.key: s.value for s in db_session.query(UserSetting).all()}
            
            # Casing
            c_val = settings.get("naming_filename_casing", "title")
            if c_val == "lower": config.casing = Casing.LOWER
            elif c_val == "upper": config.casing = Casing.UPPER
            elif c_val == "title": config.casing = Casing.TITLE
            else: config.casing = Casing.DEFAULT
            
            # Separator
            s_val = settings.get("naming_word_separator", "space")
            if s_val == "dot": config.separator = Separator.DOT
            elif s_val == "dash": config.separator = Separator.DASH
            elif s_val == "underscore": config.separator = Separator.UNDERSCORE
            else: config.separator = Separator.SPACE

            # Templates (Files)
            config.movie_file = settings.get("naming_movie_template", config.movie_file).replace("{{", "{").replace("}}", "}")
            config.episode_file = settings.get("naming_episode_template", config.episode_file).replace("{{", "{").replace("}}", "}")
            
            # Templates (Folders)
            config.movie_folder = settings.get("folder_movie_template", config.movie_folder).replace("{{", "{").replace("}}", "}")
            config.collection_folder = settings.get("folder_collection_template", config.collection_folder).replace("{{", "{").replace("}}", "}")
            config.series_folder = settings.get("folder_show_template", config.series_folder).replace("{{", "{").replace("}}", "}")
            config.season_folder = settings.get("folder_season_template", config.season_folder).replace("{{", "{").replace("}}", "}")
            config.episode_folder = settings.get("folder_episode_template", config.episode_folder).replace("{{", "{").replace("}}", "}")

            # Templates (Extras)
            config.extra_video_template = settings.get("extras_video_template", config.extra_video_template).replace("{{", "{").replace("}}", "}")
            config.extra_sub_template = settings.get("extras_sub_template", config.extra_sub_template).replace("{{", "{").replace("}}", "}")
            config.extra_audio_template = settings.get("extras_audio_template", config.extra_audio_template).replace("{{", "{").replace("}}", "}")
            config.extra_img_template = settings.get("extras_img_template", config.extra_img_template).replace("{{", "{").replace("}}", "}")
            config.extra_meta_template = settings.get("extras_meta_template", config.extra_meta_template).replace("{{", "{").replace("}}", "}")

            # Folder Switches
            config.org_enabled = settings.get("folder_organization_enabled", True)
            config.move_to_library = settings.get("folder_move_to_library", True)
            config.library_path = settings.get("folder_library_path", "")
            config.sort_by_type = settings.get("folder_sort_by_type", True)
            config.movies_dir_name = settings.get("folder_movies_name", "Movies")
            config.series_dir_name = settings.get("folder_series_name", "TV Shows")
            
            config.create_movie_subdir = settings.get("folder_create_movie_subdir", True)
            config.create_collection_dir = settings.get("folder_create_collection_dir", True)
            config.create_series_dir = settings.get("folder_create_show_dir", True)
            config.create_season_dir = settings.get("folder_create_season_dir", True)
            config.create_episode_dir = settings.get("folder_create_episode_dir", False)
            config.remove_empty = settings.get("folder_remove_empty", True)

            # Extras Switches & Actions
            config.extras_enabled = settings.get("extras_enabled", True)
            config.extra_video_action = settings.get("extras_video_action", "rename")
            config.extra_sub_action = settings.get("extras_sub_action", "rename")
            config.extra_audio_action = settings.get("extras_audio_action", "rename")
            config.extra_img_action = settings.get("extras_img_action", "rename")
            config.extra_meta_action = settings.get("extras_meta_action", "rename")
            config.extras_folder_mode = settings.get("extras_folder_mode", "subfolder")

            # Parts
            config.part_keyword = settings.get("naming_part_keyword", "Part")
            num_style = settings.get("naming_numbering_style", "1, 2, 3..")
            if "I, II" in num_style: config.part_numbering = "roman"
            elif "A, B" in num_style: config.part_numbering = "alpha"
            else: config.part_numbering = "numeric"
            
            ps_val = settings.get("naming_inner_separator", "space")
            if ps_val == "dot": config.part_separator = Separator.DOT
            elif ps_val == "dash": config.part_separator = Separator.DASH
            elif ps_val == "underscore": config.part_separator = Separator.UNDERSCORE
            else: config.part_separator = Separator.SPACE
            
            config.custom_text = settings.get("naming_custom_tag", "default")
            
        except Exception as e:
            print(f"Error loading FormatterConfig from DB: {e}")
        return config


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

    def format_item(self, item: 'MediaItem', match: MediaMatch, loc: 'MetadataLocalization') -> RenamePreview:
        """
        Generates a preview for a single item using official metadata.
        Used for updating planned_path after enrichment.
        """
        if not self.config.org_enabled:
             # Just rename in place (keep same folder)
             target_name = self.format_movie_filename(self.build_movie_context(item, match, loc)) if match.item_type == ItemType.MOVIE else self.format_episode_filename(self.build_tv_context(item, match, loc))
             return RenamePreview(
                item_id=item.id,
                original_path=item.current_path,
                target_name=target_name,
                target_subpath="",
                item_type=match.item_type.value,
                destination_root=os.path.dirname(item.current_path)
             )

        if match.item_type == ItemType.MOVIE:
            context = self.build_movie_context(item, match, loc)
            target_name = self.format_movie_filename(context)
            cat_folder = self.get_category_folder("movie")
            folder_name = self.format_movie_foldername(context)
            
            # Build subpath carefully to avoid empty parts or '.'
            parts = [p for p in [cat_folder, folder_name] if p and str(p).strip() and str(p) != "."]
            target_subpath = "/".join(parts) if parts else ""
            
        elif match.item_type in [ItemType.SERIES, ItemType.SEASON, ItemType.EPISODE]:
            context = self.build_tv_context(item, match, loc)
            
            # Always use the configured episode template for files in TV categories,
            # regardless of match specificity (SERIES/SEASON/EPISODE).
            # This ensures user-defined naming settings are always respected.
            target_name = self.format_episode_filename(context)
                
            cat_folder = self.get_category_folder("series")
            series_folder = self.format_series_foldername(context)
            season_folder = self.format_season_foldername(context)
            
            # Build subpath carefully
            parts = [p for p in [cat_folder, series_folder, season_folder] if p and str(p).strip() and str(p) != "."]
            target_subpath = "/".join(parts) if parts else ""
        else:
            target_name = item.filename
            target_subpath = ""

        # Normalize slashes
        target_subpath = target_subpath.replace("\\", "/")
        target_name = target_name.replace("\\", "/")

        dest_root = self.config.library_path if self.config.move_to_library and self.config.library_path else os.path.dirname(item.current_path)

        return RenamePreview(
            item_id=item.id,
            original_path=item.current_path,
            target_name=target_name,
            target_subpath=target_subpath,
            item_type=match.item_type.value,
            destination_root=dest_root
        )

    def plan_rename(self, match: MediaMatch, destination_root: str) -> RenamePreview:
        """
        Generates a comprehensive renaming plan for a media item and all its extras.
        Validates path lengths and resolves potential filename collisions.
        """
        item = match.media_item
        loc = next((l for l in match.localizations if l.is_primary), match.localizations[0])
        
        # 1. Context építés & Útvonal generálás
        if not self.config.org_enabled:
             # Nincs mappaszerkezet, csak fájlnév változás (helyben)
             if match.item_type == ItemType.MOVIE:
                 context = self.build_movie_context(item, match, loc)
                 target_name = self.format_movie_filename(context)
             else:
                 context = self.build_tv_context(item, match, loc)
                 target_name = self.format_episode_filename(context)
             target_subpath = ""
        else:
            if match.item_type == ItemType.MOVIE:
                context = self.build_movie_context(item, match, loc)
                target_name = self.format_movie_filename(context)
                cat_folder = self.get_category_folder("movie")
                folder_name = self.format_movie_foldername(context)
                target_subpath = str(Path(cat_folder) / folder_name)
            else:
                context = self.build_tv_context(item, match, loc)
                
                # Use the configured episode template for all TV-related file matches
                target_name = self.format_episode_filename(context)
                    
                cat_folder = self.get_category_folder("series")
                series_folder = self.format_series_foldername(context)
                season_folder = self.format_season_foldername(context)
                target_subpath = str(Path(cat_folder) / series_folder / season_folder)

        # Célmappa meghatározása (Global Library vs In-place)
        effective_root = destination_root
        if self.config.move_to_library and self.config.library_path:
            effective_root = self.config.library_path
        elif not destination_root:
            effective_root = os.path.dirname(item.current_path)

        # 2. Fő preview létrehozása
        main_preview = RenamePreview(
            item_id=item.id,
            original_path=item.current_path,
            target_name=target_name,
            target_subpath=target_subpath,
            item_type=match.item_type.value,
            destination_root=effective_root
        )

        # 3. Extrák tervezése
        if self.config.extras_enabled:
            parent_name_no_ext = target_name.rsplit(".", 1)[0]
            for extra in item.extras:
                # Meghatározzuk az akciót a típus alapján
                cat = extra.category.value if hasattr(extra.category, 'value') else str(extra.category)
                action = getattr(self.config, f"extra_{cat}_action", "rename")
                
                if action == "ignore":
                    continue
                
                if action == "delete":
                    # Különleges preview, ami jelzi a törlést
                    main_preview.extra_previews.append(RenamePreview(
                        item_id=extra.id,
                        original_path=extra.current_path,
                        target_name="", # Üres név jelzi a törlést
                        target_subpath="",
                        item_type="extra",
                        destination_root="",
                        extra_id=extra.id,
                        warnings=["File will be deleted according to extras settings."]
                    ))
                    continue

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
                    destination_root=effective_root,
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
        return self._render(self.config.movie_file, context, is_file=True)

    def format_movie_foldername(self, context: Dict[str, Any]) -> str:
        if not self.config.create_movie_subdir:
            return ""
            
        # Ha van gyűjtemény, és be van kapcsolva a gyűjtemény mappa
        # Check both cases just to be safe
        coll_val = context.get("Collection") or context.get("collection")
        if self.config.create_collection_dir and coll_val and str(coll_val).strip():
            coll_name = self.format_collection_foldername(context)
            movie_name = self._render(self.config.movie_folder, context, is_file=False)
            if coll_name and movie_name:
                return f"{coll_name}/{movie_name}"
            return movie_name or coll_name
            
        return self._render(self.config.movie_folder, context, is_file=False)

    def format_collection_foldername(self, context: Dict[str, Any]) -> str:
        # Ensure we have a valid template for collection
        tmpl = self.config.collection_folder or "{Collection}"
        return self._render(tmpl, context, is_file=False)

    # =========================================================================
    # Publikus API - Sorozatok
    # =========================================================================

    def format_series_foldername(self, context: Dict[str, Any]) -> str:
        if not self.config.create_series_dir:
            return ""
        return self._render(self.config.series_folder, context, is_file=False)

    def format_season_foldername(self, context: Dict[str, Any]) -> str:
        if not self.config.create_season_dir:
            return ""
        return self._render(self.config.season_folder, context, is_file=False)

    def format_episode_filename(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.episode_file, context, is_file=True)

    def format_extra_filename(self, context: Dict[str, Any]) -> str:
        cat = context.get("category", "")
        if cat == "video":
            tmpl = self.config.extra_video_template
        elif cat == "subtitle":
            tmpl = self.config.extra_sub_template
        elif cat == "audio":
            tmpl = self.config.extra_audio_template
        elif cat == "image":
            tmpl = self.config.extra_img_template
        elif cat == "metadata":
            tmpl = self.config.extra_meta_template
        else:
            tmpl = "{parent_name} {sub_category}"
            
        name = self._render(tmpl, context, is_file=True)
        # Eltávolítjuk a felesleges szóközöket, amik az üres változókból adódnak
        name = " ".join(name.split())
        return name

    def get_extra_subpath(self, extra) -> str:
        """Visszaadja az extra fájl alkönyvtárát a stratégia alapján."""
        if self.config.extras_folder_mode == "flat":
            return ""
        
        return self.config.extras_subfolder_name

    def build_extra_context(self, extra, parent_formatted_name: str) -> Dict[str, Any]:
        """
        Összegyűjti a változókat egy extra fájlhoz.
        parent_formatted_name: A szülő fájl neve kiterjesztés NÉLKÜL.
        """
        # subtype finomítás
        sub_cat = extra.subtype.value.replace("_", " ").title() if extra.subtype else ""
        # Ha Metadata és a sub_cat megegyezik a kiterjesztéssel, akkor üres legyen
        if extra.category == "Metadata" and sub_cat.lower() == (extra.extension or "").lower().strip("."):
            sub_cat = ""

        return {
            "ParentName": parent_formatted_name,
            "parent_name": parent_formatted_name, # keep old for safety
            "Category": extra.category.value if extra.category else "",
            "category": extra.category.value if extra.category else "",
            "SubCategory": sub_cat,
            "sub_category": sub_cat, # keep old for safety
            "Language": extra.language.upper() if extra.language else "",
            "language": extra.language.upper() if extra.language else "",
            "ext": extra.extension or "",
            "custom": self.config.custom_text
        }

    def get_category_folder(self, item_type_value: str) -> str:
        """Visszaadja a kategória-mappa nevét (Movies/Series), ha be van kapcsolva."""
        if not self.config.sort_by_type:
            return ""
        
        if item_type_value == "movie":
            return self.config.movies_dir_name
        if item_type_value in ["series", "episode"]:
            return self.config.series_dir_name
        return ""

    # =========================================================================
    # Context Builderek
    # =========================================================================

    def build_movie_context(self, item, match, loc) -> Dict[str, Any]:
        """Összegyűjti a változókat egy filmhez."""
        from ..db.models import PartType, PartStyle
        ctx = self._build_common_tech_context(item)
        
        # Alap metaadatok (PascalCase a frontend sablonokhoz)
        ctx.update({
            "Title": loc.title or "",
            "OriginalTitle": loc.original_title or "",
            "Year": str(match.release_date.year) if match.release_date else "",
            "ReleaseDate": match.release_date.strftime("%Y-%m-%d") if match.release_date else "",
            "Edition": self._format_enum_val(item.edition),
            "Source": self._format_source(item.source),
            "AudioType": self._format_enum_val(item.audio_type),
            "Custom": self.config.custom_text,
            "ImdbId": match.imdb_id or "",
            "TmdbId": str(match.tmdb_id) if match.tmdb_id else "",
            "RatingImdb": str(match.rating_imdb) if match.rating_imdb else "",
            "Collection": match.collection or "", # Belső használatra
            "ext": item.extension or "",
        })

        # Part kezelés
        part_label, part_val, part_sep = self._build_part_info(item)
        ctx["PartType"] = part_label
        ctx["Part"] = part_val
        ctx["PartSep"] = part_sep

        return ctx

    def build_tv_context(self, item, match, loc, children: List[Any] = None) -> Dict[str, Any]:
        """
        Összegyűjti a változókat sorozathoz / szezonhoz / epizódhoz.
        """
        ctx = self._build_common_tech_context(item)
        
        if children:
            ctx["Resolution"] = self._calculate_mixed_resolution(children)

        # Sorozat/Szezon/Epizód meta (PascalCase)
        ctx.update({
            "SeriesTitle": loc.series_title or loc.title or "",
            "ShowTitle": loc.series_title or loc.title or "",
            "SeriesOriginalTitle": loc.original_series_title or "",
            "ShowOriginalTitle": loc.original_series_title or "",
            "SeriesTmdbId": str(match.series_tmdb_id or match.tmdb_id or ""),
            "SeriesImdbId": getattr(match, 'series_imdb_id', None) or match.imdb_id or "",
            "SeriesRatingImdb": str(getattr(match, 'series_rating_imdb', None) or match.rating_imdb or ""),
            "Networks": ", ".join(match.networks) if match.networks else "",
            "FirstAirDate": match.first_air_date.strftime("%Y-%m-%d") if match.first_air_date else "",
            "FirstAirYear": str(match.first_air_date.year) if match.first_air_date else "",
            "LastAirDate": match.last_air_date.strftime("%Y-%m-%d") if match.last_air_date else "",
            "LastAirYear": str(match.last_air_date.year) if match.last_air_date else "",
            "YearRange": f"{match.first_air_date.year}-{match.last_air_date.year}" if (match.first_air_date and match.last_air_date and match.first_air_date.year != match.last_air_date.year) else (str(match.first_air_date.year) if match.first_air_date else ""),
            "SeriesSeasonCount": str(match.number_of_seasons or ""),
            "SeriesEpisodeCount": str(match.number_of_episodes or ""),
            "SeriesStatus": match.release_status or "",
            "SeriesType": match.series_type or "",
            "Director": match.director or "",
            
            "SeasonNumber": self.format_number(match.season_number),
            "Season": self.format_number(match.season_number),
            "SeasonName": loc.season_title or "",
            "SeasonTmdbId": str(match.season_tmdb_id or ""),
            "SeasonEpisodeCount": str(match.episode_count or ""),
            "SeasonAirDate": match.season_air_date.strftime("%Y-%m-%d") if match.season_air_date else "",
            "SeasonAirYear": str(match.season_air_date.year) if match.season_air_date else "",

            "EpisodeNumber": self.format_number(match.episode_number),
            "Episode": self.format_number(match.episode_number),
            "episode": self.format_number(match.episode_number),
            "EpisodeTitle": loc.episode_title or (loc.title if loc.title != loc.series_title else ""),
            "EpisodeName": loc.episode_title or (loc.title if loc.title != loc.series_title else ""),
            "episode_title": loc.episode_title or (loc.title if loc.title != loc.series_title else ""),
            "episode_name": loc.episode_title or (loc.title if loc.title != loc.series_title else ""),
            "EpisodeAirDate": match.episode_air_date.strftime("%Y-%m-%d") if match.episode_air_date else "",
            "EpisodeAirYear": str(match.episode_air_date.year) if match.episode_air_date else "",
            "EpisodeRatingImdb": str(match.rating_imdb) if match.item_type.value == "episode" else "",
            "EpisodeTmdbId": str(match.tmdb_id) if match.item_type.value == "episode" else "",
            "EpisodeImdbId": match.imdb_id if match.item_type.value == "episode" else "",

            "Custom": self.config.custom_text,
            "ext": item.extension or "",
        })

        # Part kezelés
        part_label, part_val, part_sep = self._build_part_info(item)
        ctx["PartType"] = part_label
        ctx["Part"] = part_val
        ctx["PartSep"] = part_sep

        return ctx

    # =========================================================================
    # Segédfüggvények
    # =========================================================================

    def _build_common_tech_context(self, item) -> Dict[str, Any]:
        from .tech_mapping import map_resolution
        res = item.resolution or ""
        if "x" in res.lower() and "p" not in res.lower():
            try:
                parts = res.lower().split("x")
                if len(parts) == 2:
                    w, h = int(parts[0]), int(parts[1])
                    res = map_resolution(w, h)
            except: pass
            
        return {
            "Resolution": res,
            "VideoCodec": item.video_codec or "",
            "AudioCodec": item.audio_codec or "",
            "AudioChannels": item.audio_channels or "",
            "BitDepth": f"{item.bit_depth}bit" if item.bit_depth else "",
            "HDR": item.hdr_type or "",
            "Framerate": str(item.framerate) if item.framerate else "",
            "VideoBitrate": f"{round(item.video_bitrate / 1000)}kbps" if item.video_bitrate else "",
        }

    def _build_part_info(self, item) -> (str, str, str):
        from ..db.models import PartType, PartStyle
        label = self.config.part_keyword
        val = ""
        sep = self.config.part_separator.value
        
        if item.part is not None:
            # Item specific override for keyword
            if item.part_type and item.part_type != PartType.NONE:
                label = item.part_type.value
            
            # Numbering logic
            style = item.part_style
            if not style or style == PartStyle.NONE:
                # Use global default
                if self.config.part_numbering == "roman": val = to_roman(item.part)
                elif self.config.part_numbering == "alpha": val = to_alpha(item.part)
                else: val = str(item.part)
            else:
                # Use item specific style
                if style == PartStyle.ROMAN: val = to_roman(item.part)
                elif style == PartStyle.ALPHA: val = to_alpha(item.part)
                else: val = str(item.part)
                
        return label, val, sep

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

    def _render(self, template: str, context: Dict[str, Any], is_file: bool = True) -> str:
        """Rendereli a template-et, és automatikusan hozzáadja a kiterjesztést, ha fájlról van szó."""
        # 1. Behelyettesítés (Case and Underscore insensitive lookup)
        # Create a normalized mapping (lowercase, no underscores)
        norm_ctx = {k.lower().replace("_", ""): v for k, v in context.items()}
        result = self.TEMPLATE_VAR.sub(lambda m: str(norm_ctx.get(m.group(1).lower().replace("_", ""), "")), template)
        
        # 2. Üres zárójelek/maradványok takarítása
        result = re.sub(r'\(\s*\)', '', result)
        result = re.sub(r'\[\s*\]', '', result)
        
        # Collapse multiple separators (e.g., " -  - " -> " - ")
        sep = self.config.separator.value
        if sep == " ":
            result = re.sub(r'\s*-\s*-\s*', ' - ', result)
            result = re.sub(r'\s{2,}', ' ', result)
        
        result = re.sub(r'\s*-\s*$', '', result)
        result = re.sub(r'^\s*-\s*', '', result)
        result = self.sanitize(result)

        # 3. Casing és Separator alkalmazása (csak a névre, a kiterjesztésre nem!)
        result = self.apply_casing(result, context)
        result = self.apply_separator(result)

        # 4. Automatikus kiterjesztés hozzáadása, ha fájlról van szó
        if is_file:
            ext = context.get("ext", "")
            if ext:
                ext_lower = ext.lower()
                if not result.lower().endswith(ext_lower):
                    result = f"{result}{ext_lower}"

        return result.strip()

    def apply_casing(self, text: str, context: Optional[Dict[str, Any]] = None) -> str:
        if not text: return ""
        if self.config.casing == Casing.LOWER: return text.lower()
        if self.config.casing == Casing.UPPER: return text.upper()
        if self.config.casing == Casing.TITLE:
            title_text = text.title()
            if context:
                # Különleges, önállóan nagybetűs elemek védelme a Title Case-től (pl. HU, CD, III)
                for key in ["language", "part_type", "part"]:
                    val = context.get(key)
                    if isinstance(val, str) and val:
                        val_title = val.title()
                        if val != val_title:
                            title_text = re.sub(fr'\b{re.escape(val_title)}\b', val, title_text)
            return title_text
        return text

    def apply_separator(self, text: str) -> str:
        if not text: return ""
        sep = self.config.separator.value
        normalized = self.MULTI_SPACE.sub(" ", text.strip())
        return normalized.replace(" ", sep) if sep != " " else normalized

    def format_number(self, num, width: int = 2) -> str:
        if isinstance(num, (list, tuple)):
            return f"-E".join(str(n).zfill(width) for n in num)
            
        try: 
            n = int(num)
        except: 
            # Ha string és JSON lista, próbáljuk meg parse-olni
            if isinstance(num, str) and num.startswith("["):
                 try:
                     import ast
                     parsed = ast.literal_eval(num)
                     if isinstance(parsed, list):
                         return self.format_number(parsed, width)
                 except: pass
            return str(num) if num else ""
            
        return str(n).zfill(width) if self.config.zero_pad else str(n)

    def sanitize(self, text: str) -> str:
        if not text: return ""
        return self.MULTI_SPACE.sub(" ", self.ILLEGAL_CHARS.sub("", text)).strip(". ")
