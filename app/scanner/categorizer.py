from pathlib import Path
from typing import List, Dict, Tuple
import sys
import os

# Hozzáadjuk a gyökérkönyvtárat, hogy elérjük a modelleket
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.db.models import ExtraCategory, ExtraSubtype

class Categorizer:
    """
    Submodule 2: Categorizes extra files (subtitles, images, etc.) 
    into logical categories and subtypes based on filename keywords and extensions.
    """
    
    # Keyword mapping for automated subtype detection
    SUBTYPE_MAP = {
        'trailer': ExtraSubtype.TRAILER,
        'teaser': ExtraSubtype.TRAILER,
        'sample': ExtraSubtype.SAMPLE,
        'minta': ExtraSubtype.SAMPLE, # Hungarian for 'sample'
        'behind': ExtraSubtype.BEHIND_THE_SCENES,
        'making': ExtraSubtype.BEHIND_THE_SCENES,
        'featurette': ExtraSubtype.FEATURETTE,
        'deleted': ExtraSubtype.DELETED_SCENES,
        'kimaradt': ExtraSubtype.DELETED_SCENES, # Hungarian for 'deleted/omitted'
        'interview': ExtraSubtype.INTERVIEW,
        'riport': ExtraSubtype.INTERVIEW, # Hungarian for 'report/interview'
        'short': ExtraSubtype.SHORT,
        'promo': ExtraSubtype.PROMO,
        'clip': ExtraSubtype.CLIP,
        # Images
        'poster': ExtraSubtype.POSTER,
        'poszter': ExtraSubtype.POSTER, # Hungarian for 'poster'
        'fanart': ExtraSubtype.FANART,
        'backdrop': ExtraSubtype.BACKDROP,
        'hatter': ExtraSubtype.BACKDROP, # Hungarian for 'background'
        'banner': ExtraSubtype.BANNER,
        'thumb': ExtraSubtype.THUMBNAIL,
        'logo': ExtraSubtype.LOGO,
        'clearlogo': ExtraSubtype.CLEARLOGO,
        'disc': ExtraSubtype.DISC,
        'lemez': ExtraSubtype.DISC, # Hungarian for 'disc'
        # Subtitles
        'forced': ExtraSubtype.FORCED,
        'kenyszeritett': ExtraSubtype.FORCED, # Hungarian for 'forced'
        'sdh': ExtraSubtype.SDH,
        'commentary': ExtraSubtype.COMMENTARY_SUB,
        'full': ExtraSubtype.FULL,
        # Audio
        'dub': ExtraSubtype.DUBBED,
        'szinkron': ExtraSubtype.DUBBED, # Hungarian for 'dubbed/sync'
        'original': ExtraSubtype.ORIGINAL,
        'score': ExtraSubtype.ISOLATED_SCORE,
    }

    def categorize(self, file_path: Path) -> Tuple[ExtraCategory, ExtraSubtype]:
        """
        Determines the category and subtype of a file.
        Uses extensions for primary categorization and keywords for subtype refinement.
        """
        ext = file_path.suffix.lower()
        name = file_path.stem.lower()
        
        # 1. Determine base category by extension
        category = None
        if ext in {'.mkv', '.mp4', '.avi', '.mov', '.wmv'}: category = ExtraCategory.VIDEO
        elif ext in {'.srt', '.sub', '.ass', '.idx'}: category = ExtraCategory.SUBTITLE
        elif ext in {'.jpg', '.jpeg', '.png', '.webp'}: category = ExtraCategory.IMAGE
        elif ext in {'.ac3', '.dts', '.flac', '.mp3'}: category = ExtraCategory.AUDIO
        elif ext in {'.nfo', '.xml', '.txt', '.json'}: category = ExtraCategory.METADATA

        # If no category was identified, it's 'trash' - return None
        if category is None:
            return None, None

        # 2. Refine subtype using keywords in the filename
        subtype = None
        
        # Search for known keywords in the filename
        for key, value in self.SUBTYPE_MAP.items():
            if key in name:
                subtype = value
                break

        # Guard: DUBBED is audio-only, never applies to subtitles
        if category == ExtraCategory.SUBTITLE and subtype == ExtraSubtype.DUBBED:
            subtype = None

        # Special case for Metadata files - they should prioritize their specific type
        if ext == '.nfo': subtype = ExtraSubtype.NFO
        elif ext == '.xml': subtype = ExtraSubtype.XML
        elif ext == '.json': subtype = ExtraSubtype.JSON
        elif ext == '.txt': subtype = ExtraSubtype.TXT
                
        return category, subtype

    def get_language(self, file_path: Path) -> Optional[str]:
        """
        Extracts language tags from the filename (e.g., .hun., .eng.).
        Current implementation is a basic keyword match.
        """
        name = file_path.name.lower()
        if 'hun' in name or 'magyar' in name: return 'hun'
        if 'eng' in name or 'english' in name: return 'eng'
        return None
