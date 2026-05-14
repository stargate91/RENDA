import logging
from typing import List, Any, Dict
from .tech_mapping import map_resolution

logger = logging.getLogger(__name__)

class TechParser:
    """
    Handles parsing and formatting of technical media properties 
    (Resolution, Codecs, Sources, HDR, etc.).
    """

    @staticmethod
    def parse_resolution(resolution: str) -> str:
        """Standardizes resolution strings (e.g., 1920x1080 -> 1080p)."""
        if not resolution: return ""
        if "x" in resolution.lower() and "p" not in resolution.lower():
            try:
                parts = resolution.lower().split("x")
                if len(parts) == 2:
                    w, h = int(parts[0]), int(parts[1])
                    return map_resolution(w, h)
            except: pass
        return resolution

    @staticmethod
    def format_enum_val(enum_obj) -> str:
        """Formats internal enum values for display (e.g., directors_cut -> Director's Cut)."""
        if not enum_obj or enum_obj.value == "none": return ""
        return enum_obj.value.replace("_", " ").title().replace("Directors Cut", "Director's Cut")

    @staticmethod
    def format_source(source_enum) -> str:
        """Special formatting for media sources."""
        if not source_enum or source_enum.value == "none": return ""
        val = source_enum.value.upper()
        if val == "BLURAY": return "BluRay"
        if val == "WEB": return "WEB-DL"
        return val

    @staticmethod
    def calculate_mixed_resolution(items: List[Any]) -> str:
        """Calculates a representative resolution for a collection of items."""
        res_list = sorted(list(set(i.resolution for i in items if i.resolution)), 
                         key=lambda x: int(x.replace('p','').replace('K','000')) if 'p' in x else 0)
        if not res_list: return ""
        if len(res_list) == 1: return res_list[0]
        if len(res_list) == 2: return f"{res_list[0]}-{res_list[1]}"
        return "Mixed"

    @staticmethod
    def get_tech_context(item: Any) -> Dict[str, Any]:
        """Returns a standardized technical context dictionary."""
        res = TechParser.parse_resolution(item.resolution or "")
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
