import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from .tech_parser import TechParser
from ..db.models import PartType, PartStyle, ItemType

logger = logging.getLogger(__name__)

class ContextBuilder:
    """
    Orchestrates the creation of naming contexts for different media types.
    Combines technical metadata with descriptive metadata.
    """

    def __init__(self, config: Any):
        self.config = config
        self.tech_parser = TechParser()

    def build_movie_context(self, item: Any, match: Any, loc: Any) -> Dict[str, Any]:
        """Builds context variables for a Movie."""
        ctx = self.tech_parser.get_tech_context(item)
        
        ctx.update({
            "Title": loc.title or "",
            "OriginalTitle": loc.original_title or "",
            "Year": str(match.release_date.year) if match.release_date else "",
            "ReleaseDate": match.release_date.strftime("%Y-%m-%d") if match.release_date else "",
            "Edition": self.tech_parser.format_enum_val(item.edition),
            "Source": self.tech_parser.format_source(item.source),
            "AudioType": self.tech_parser.format_enum_val(item.audio_type),
            "Custom": self.config.custom_text,
            "ImdbId": match.imdb_id or "",
            "TmdbId": str(match.tmdb_id) if match.tmdb_id else "",
            "RatingImdb": str(match.rating_imdb) if match.rating_imdb else "",
            "Collection": match.collection or "",
            "ext": item.extension or "",
        })

        part_label, part_val, part_sep = self._build_part_info(item)
        ctx.update({"PartType": part_label, "Part": part_val, "PartSep": part_sep})
        return ctx

    def build_tv_context(self, item: Any, match: Any, loc: Any, children: List[Any] = None) -> Dict[str, Any]:
        """Builds context variables for Series, Seasons, and Episodes."""
        ctx = self.tech_parser.get_tech_context(item)
        if children:
            ctx["Resolution"] = self.tech_parser.calculate_mixed_resolution(children)

        ctx.update({
            "SeriesTitle": loc.series_title or loc.title or "",
            "ShowTitle": loc.series_title or loc.title or "",
            "SeriesOriginalTitle": loc.original_series_title or "",
            "ShowOriginalTitle": loc.original_series_title or "",
            "SeriesTmdbId": str(match.series_tmdb_id or match.tmdb_id or ""),
            "FirstAirDate": match.first_air_date.strftime("%Y-%m-%d") if match.first_air_date else "",
            "FirstAirYear": str(match.first_air_date.year) if match.first_air_date else "",
            
            "SeasonNumber": self._format_number(match.season_number),
            "Season": self._format_number(match.season_number),
            "SeasonName": loc.season_title or "",
            
            "EpisodeNumber": self._format_number(match.episode_number, prefix_multi="E"),
            "Episode": self._format_number(match.episode_number, prefix_multi="E"),
            "EpisodeTitle": loc.episode_title or (loc.title if loc.title != loc.series_title else ""),
            
            "Custom": self.config.custom_text,
            "ext": item.extension or "",
        })

        part_label, part_val, part_sep = self._build_part_info(item)
        ctx.update({"PartType": part_label, "Part": part_val, "PartSep": part_sep})
        return ctx

    def build_extra_context(self, extra: Any, parent_formatted_name: str) -> Dict[str, Any]:
        """Builds context variables for Extra files."""
        sub_cat = extra.subtype.value.replace("_", " ").title() if extra.subtype else ""
        if extra.category == "Metadata" and sub_cat.lower() == (extra.extension or "").lower().strip("."):
            sub_cat = ""

        return {
            "ParentName": parent_formatted_name,
            "Category": extra.category.value if extra.category else "",
            "SubCategory": sub_cat,
            "Language": extra.language.upper() if extra.language else "",
            "ext": extra.extension or "",
            "custom": self.config.custom_text
        }

    def _build_part_info(self, item: Any) -> (str, str, str):
        """Calculates part-related naming components."""
        label = self.config.part_keyword
        val = ""
        sep = self.config.part_separator.value
        
        if item.part is not None:
            if item.part_type and item.part_type != PartType.NONE:
                label = item.part_type.value
            
            style = item.part_style
            from .formatter import to_roman, to_alpha
            if style == PartStyle.ROMAN or (not style and self.config.part_numbering == "roman"):
                val = to_roman(item.part)
            elif style == PartStyle.ALPHA or (not style and self.config.part_numbering == "alpha"):
                val = to_alpha(item.part)
            else:
                val = str(item.part)
                
        return label, val, sep

    def _format_number(self, num: Any, prefix_multi: str = "") -> str:
        """Formats season/episode numbers with zero padding if enabled."""
        if num is None or str(num).strip() == "": return ""
        import json
        
        if isinstance(num, str):
            num = num.strip()
            if num.startswith("[") and num.endswith("]"):
                try:
                    num = json.loads(num)
                except:
                    pass
            elif "," in num:
                num = [n.strip() for n in num.split(",")]

        try:
            if isinstance(num, list) and len(num) > 0:
                parts = []
                for i, n in enumerate(num):
                    formatted_n = self._format_single_num(n)
                    if i > 0:
                        parts.append(f"{prefix_multi}{formatted_n}")
                    else:
                        parts.append(formatted_n)
                return "-".join(parts)
            return self._format_single_num(num)
        except:
            return str(num)

    def _format_single_num(self, n: Any) -> str:
        if self.config.zero_pad:
            return f"{int(n):02d}"
        return str(n)
