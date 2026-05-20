import re
from typing import Dict, Any, Optional
from .config import FormatterConfig, Casing

class TemplateRenderer:
    """
    Handles template rendering, string casing, separator replacement,
    number formatting, and path sanitization.
    """

    ILLEGAL_CHARS = re.compile(r'[\\/:*?"<>|]')
    MULTI_SPACE = re.compile(r'\s{2,}')
    TEMPLATE_VAR = re.compile(r'\{(\w+)\}')

    def __init__(self, config: FormatterConfig):
        self.config = config

    def render(self, template: str, context: Dict[str, Any], is_file: bool = True) -> str:
        """Rendereli a template-et, és automatikusan hozzáadja a kiterjesztést, ha fájlról van szó."""
        if not template:
            return ""
            
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
        if not text:
            return ""
        if self.config.casing == Casing.LOWER:
            return text.lower()
        if self.config.casing == Casing.UPPER:
            return text.upper()
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
        if not text:
            return ""
        sep = self.config.separator.value
        normalized = self.MULTI_SPACE.sub(" ", text.strip())
        return normalized.replace(" ", sep) if sep != " " else normalized

    def format_number(self, num: Any, width: int = 2) -> str:
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
                 except: 
                     pass
            return str(num) if num else ""
            
        return str(n).zfill(width) if self.config.zero_pad else str(n)

    def sanitize(self, text: str) -> str:
        if not text:
            return ""
        return self.MULTI_SPACE.sub(" ", self.ILLEGAL_CHARS.sub("", text)).strip(". ")
