import subprocess
import json
from pathlib import Path
from typing import Optional, Dict, Any
from guessit import guessit

class Enrichment:
    """
    4. ALMODUL: Gazdagítja a MediaItem-eket technikai és metaadatokkal.
    Használja: FFmpeg (ffprobe) és Guessit.
    """

    def analyze_guessit(self, text: str) -> Dict[str, Any]:
        """
        Lefuttatja a Guessit-et egy adott szövegen (fájlnév vagy mappa).
        """
        try:
            return guessit(text)
        except Exception as e:
            print(f"Guessit hiba ({text}): {e}")
            return {}

    def analyze_ffprobe(self, file_path: str) -> Dict[str, Any]:
        """
        Lefuttatja az ffprobe-ot a technikai adatokért.
        """
        cmd = [
            'ffprobe', 
            '-v', 'quiet', 
            '-print_format', 'json', 
            '-show_format', 
            '-show_streams', 
            file_path
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return json.loads(result.stdout)
        except Exception as e:
            print(f"FFprobe hiba ({file_path}): {e}")
            return {}

    def process_item(self, item_path: str, folder_name: str) -> Dict[str, Any]:
        """
        Összetett elemzés: Guessit a névre + Guessit a mappára + FFmpeg.
        """
        path_obj = Path(item_path)
        
        # 1. Guessit elemzések
        fn_data = self.analyze_guessit(path_obj.name)
        fd_data = self.analyze_guessit(folder_name)
        
        # 2. FFprobe elemzés
        ff_data = self.analyze_ffprobe(item_path)
        
        # Kinyerjük a belső címet az FFmpeg-ből, ha van
        internal_title = None
        it_data = {}
        if 'format' in ff_data and 'tags' in ff_data['format']:
            internal_title = ff_data['format']['tags'].get('title')
            if internal_title:
                it_data = self.analyze_guessit(internal_title)

        return {
            "fn": fn_data,
            "fd": fd_data,
            "it": it_data,
            "internal_title": internal_title,
            "ff": ff_data
        }
