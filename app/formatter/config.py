from enum import Enum
from dataclasses import dataclass

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
