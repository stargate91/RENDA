from guessit import guessit
from typing import Dict, Any, Optional

class Analyzer:
    """
    Guessit-based analyzer for the 'Triple' metadata strategy.
    Evaluates internal titles, filenames, and directory names.
    """

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Runs Guessit analysis on a given string.
        """
        if not text:
            return {}
        try:
            return dict(guessit(text))
        except Exception as e:
            # Note: logging is handled by the manager
            return {}

    def extract_language(self, text: str) -> Optional[str]:
        """
        Extracts language codes (e.g., 'hu', 'en') from text.
        Checks both 'language' and 'subtitle_language' fields.
        """
        data = self.analyze_text(text)
        langs = data.get('language') or data.get('subtitle_language')
        
        if isinstance(langs, list) and langs:
            lang = langs[0]
            # Prefer Alpha2 (2-letter) code, fallback to Alpha3 or string representation
            return getattr(lang, 'alpha2', str(lang))
        elif langs:
            return getattr(langs, 'alpha2', str(langs))
        return None

    def get_triple_data(self, internal_title: Optional[str], filename: str, folder_name: str) -> Dict[str, Any]:
        """
        Executes the 'Triple Analysis' strategy.
        Returns data from the internal file title, the filename, and the immediate parent folder.
        """
        return {
            "it": self.analyze_text(internal_title) if internal_title else {},
            "fn": self.analyze_text(filename),
            "fd": self.analyze_text(folder_name)
        }
