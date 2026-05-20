import os
from typing import Optional, Dict, Any, List
from pathlib import Path

from ..db.models import MediaMatch, ItemType
from .config import Casing, Separator, ExtraOrg, FormatterConfig
from .utils import to_roman, to_alpha
from .models import RenamePreview
from .context_builder import ContextBuilder
from .template_renderer import TemplateRenderer
from .path_resolver import PathResolver

class Formatter:
    """
    Generator for standardized file and directory names.
    Handles template rendering, illegal character stripping, and collision resolution.
    """

    ILLEGAL_CHARS = TemplateRenderer.ILLEGAL_CHARS
    MULTI_SPACE = TemplateRenderer.MULTI_SPACE
    TEMPLATE_VAR = TemplateRenderer.TEMPLATE_VAR

    def __init__(self, config: Optional[FormatterConfig] = None):
        self.config = config or FormatterConfig()
        self.context_builder = ContextBuilder(self.config)
        self.renderer = TemplateRenderer(self.config)
        self.path_resolver = PathResolver()

    def format_item(self, item: Any, match: MediaMatch, loc: Any) -> RenamePreview:
        """
        Generates a preview for a single item using official metadata.
        Used for updating planned_path after enrichment.
        """
        if not self.config.org_enabled:
             # Just rename in place (keep same folder)
             target_name = (
                 self.format_movie_filename(self.build_movie_context(item, match, loc))
                 if match.item_type == ItemType.MOVIE
                 else self.format_episode_filename(self.build_tv_context(item, match, loc))
             )
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
            
            sub_path_obj = Path()
            for p in [cat_folder, folder_name]:
                if p and str(p).strip() and str(p) != ".":
                    sub_path_obj = sub_path_obj / p
            
            target_subpath = str(sub_path_obj).replace("\\", "/")
            
        elif match.item_type in [ItemType.SERIES, ItemType.SEASON, ItemType.EPISODE]:
            context = self.build_tv_context(item, match, loc)
            target_name = self.format_episode_filename(context)
                
            cat_folder = self.get_category_folder("series")
            series_folder = self.format_series_foldername(context)
            season_folder = self.format_season_foldername(context)
            
            sub_path_obj = Path()
            for p in [cat_folder, series_folder, season_folder]:
                if p and str(p).strip() and str(p) != ".":
                    sub_path_obj = sub_path_obj / p
            
            target_subpath = str(sub_path_obj).replace("\\", "/")
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
                
                short_cat = cat
                if cat == "subtitle": short_cat = "sub"
                elif cat == "image": short_cat = "img"
                elif cat == "metadata": short_cat = "meta"
                
                action = getattr(self.config, f"extra_{short_cat}_action", "rename")
                
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
                        action="delete",
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
        self.path_resolver.check_path_lengths(preview)

    def resolve_collisions(self, previews: List[RenamePreview]) -> List[RenamePreview]:
        """
        Észleli az ütközéseket és automatikusan sorszámozza az extrákat.
        Módosítja a 'previews' listát helyben.
        """
        return self.path_resolver.resolve_collisions(previews)

    # =========================================================================
    # Publikus API - Filmek
    # =========================================================================

    def format_movie_filename(self, context: Dict[str, Any]) -> str:
        return self._render(self.config.movie_file, context, is_file=True)

    def format_movie_foldername(self, context: Dict[str, Any]) -> str:
        if not self.config.create_movie_subdir:
            return ""
            
        coll_val = context.get("Collection") or context.get("collection")
        if self.config.create_collection_dir and coll_val and str(coll_val).strip():
            coll_name = self.format_collection_foldername(context)
            movie_name = self._render(self.config.movie_folder, context, is_file=False)
            if coll_name and movie_name:
                return f"{coll_name}/{movie_name}"
            return movie_name or coll_name
            
        return self._render(self.config.movie_folder, context, is_file=False)

    def format_collection_foldername(self, context: Dict[str, Any]) -> str:
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
        name = " ".join(name.split())
        return name

    def get_extra_subpath(self, extra) -> str:
        """Visszaadja az extra fájl alkönyvtárát a stratégia alapján."""
        if self.config.extras_folder_mode == "flat":
            return ""
        return self.config.extras_subfolder_name

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
        return self.context_builder.build_movie_context(item, match, loc)

    def build_tv_context(self, item, match, loc, children: List[Any] = None) -> Dict[str, Any]:
        """Összegyűjti a változókat sorozathoz / szezonhoz / epizódhoz."""
        return self.context_builder.build_tv_context(item, match, loc, children)

    def build_extra_context(self, extra, parent_formatted_name: str) -> Dict[str, Any]:
        """Összegyűjti a változókat egy extra fájlhoz."""
        return self.context_builder.build_extra_context(extra, parent_formatted_name)

    # =========================================================================
    # Segédfüggvények
    # =========================================================================

    def _render(self, template: str, context: Dict[str, Any], is_file: bool = True) -> str:
        """Rendereli a template-et, és automatikusan hozzáadja a kiterjesztést, ha fájlról van szó."""
        return self.renderer.render(template, context, is_file)

    def apply_casing(self, text: str, context: Optional[Dict[str, Any]] = None) -> str:
        return self.renderer.apply_casing(text, context)

    def apply_separator(self, text: str) -> str:
        return self.renderer.apply_separator(text)

    def format_number(self, num, width: int = 2) -> str:
        return self.renderer.format_number(num, width)

    def sanitize(self, text: str) -> str:
        return self.renderer.sanitize(text)
