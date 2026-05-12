const en = {
  "_lang_name": "English",
  "common": {
    "save": "Save Changes",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete"
  },
  "units": {
    "m": "m",
    "s": "s",
    "min": "min",
    "sec": "sec"
  },
  "phases": {
    "collecting": "Analyzing files",
    "probing": "Technical probing",
    "enriching": "Gathering metadata",
    "resolving": "Finalizing matches",
    "idle": "Idle"
  },
  "sidebar": {
    "dashboard": "Dashboard",
    "discovery": "Discovery",
    "library": "Library",
    "history": "History",
    "settings": "Settings"
  },
  "dashboard": {
    "welcome": "Welcome back, {{name}}",
    "subtitle": "Your library is optimized and up to date.",
    "stats": {
      "total_movies": "Total Movies",
      "movies_sub": "In Library",
      "tv_series": "TV Series",
      "episodes_sub": "Episodes",
      "storage_used": "Storage Used",
      "storage_sub": "across {{count}} drives",
      "unmatched": "Unmatched",
      "unmatched_sub": "Pending in Discovery"
    }
  },
  "discovery": {
    "title": "Discovery Console",
    "found_items": "Found {{count}} new items.",
    "scan_now": "Browse & Scan",
    "background_images": "Fetching Images",
    "reveal_explorer": "Show in Folder",
    "refresh": "Refresh",
    "processing": "Processing...",
    "search_placeholder": "Search in this view...",
    "no_items": "No items in this category.",
    "bulk": {
      "selected": "{{count}} items selected",
      "delete": "Delete Selected"
    },
    "empty": {
      "title": "Ready for work?",
      "subtitle": "Your workspace is currently clear. Drag & drop folders here, start a new scan, or load all pending items from the database.",
      "drop_title": "Drop to Scan",
      "drop_subtitle": "Drop your folders or files here to start the discovery process.",
      "action_scan": "Scan New Files",
      "action_resume": "Load All Pending Items ({{count}})",
      "drop_overlay_title": "Drop to Scan",
      "drop_overlay_subtitle": "Release to start discovery"
    },
    "table": {
      "name_mapping": "Original Filename",
      "planned_name": "Planned Name",
      "type": "Type",
      "status": "Status",
      "subcategory": "Category",
      "subtype": "Extension",
      "language": "Language",
      "unknown": "UNKNOWN",
      "enriching": "Enriching...",
      "pending_match": "Identify Media"
    },
    "tabs": {
      "manual": "Manual Review",
      "movies": "Movies",
      "series": "Series",
      "extras": "Extras",
      "collisions": "Collisions",
      "video": "Bonus Video",
      "subtitle": "Subtitles",
      "audio": "Audio Tracks",
      "image": "Images",
      "metadata": "Metadata"
    }
  },
  "progress": {
    "estimating": "Estimating time...",
    "finishing": "Finishing...",
    "left": "{{time}} left"
  },
  "modal": {
    "confirm": {
      "yes": "Yes, Delete",
      "cancel": "Cancel"
    },
    "resolver": {
      "title": "Manual Metadata Resolver",
      "search_placeholder": "Search movie or series title...",
      "year": "Year",
      "assignment": "Assignment",
      "season": "Season",
      "episode": "Episode",
      "confirm": "Resolve & Enrich",
      "select_hint": "Select a result from the list to assign it to this file",
      "action": "Fix Match"
    },
    "override": {
      "title": "Manual Overrides",
      "action": "Edit Details",
      "media_info": "Media Properties",
      "tv_params": "TV / Episode Parameters",
      "extra_info": "Extra File Properties",
      "localization": "Language & Region"
    },
    "metadata": {
      "tabs": {
        "technical": "Technical",
        "guessit": "Guessit Analysis",
        "overrides": "Overrides",
        "matches": "Matches ({{count}})",
        "api_raw": "API Raw Data"
      },
      "audio_streams": "Audio Streams",
      "match": "Match",
      "active": "ACTIVE",
      "na": "N/A",
      "votes": "votes",
      "localizations": "Localizations",
      "primary": "Primary",
      "no_matches": "No metadata matches found.",
      "no_api": "No raw API data available."
    }
  },
  "floating": {
    "unsaved": "You have unsaved changes.",
    "reset": "Reset",
    "save": "Save Changes",
    "saving": "Saving...",
    "saved": "Settings saved!"
  },
  "settings": {
    "title": "Settings",
    "subtitle": "Configure RENDA parameters and external integrations.",
    "save_all": "Save All Changes",
    "status": {
      "saving": "Saving...",
      "saved": "Saved successfully!",
      "error": "Error saving"
    },
    "tabs": {
      "general": "General",
      "naming": "Naming",
      "folders": "Folders",
      "extras": "Extras",
      "api": "API Keys",
      "appearance": "Appearance",
      "advanced": "Advanced"
    },
    "api": {
      "title": "API Configuration",
      "desc": "Connect your library to the world's largest media databases for automatic posters, ratings, and details.",
      "privacy_title": "Your Privacy Matters:",
      "privacy_text": "These keys are stored safely on your computer only. We never see, collect, or share your private API information.",
      "tmdb_label": "TMDB (THE MOVIE DATABASE)",
      "tmdb_key_v3": "TMDB API Key (v3)",
      "tmdb_token_v4": "TMDB Bearer Token (v4)",
      "omdb_label": "OMDB (FOR IMDB RATINGS)",
      "omdb_key": "OMDB API Key",
      "tmdb_guide_title": "How to get your TMDB Key:",
      "tmdb_guide_step1": "Create an account at {{url}}",
      "tmdb_guide_step2": "Go to Settings > API from your profile",
      "tmdb_guide_step3": "Click Create and select Developer",
      "tmdb_guide_step4": "Copy the 'API Key (v3)' or 'Read Access Token' here.",
      "omdb_guide_title": "How to get your OMDB Key (for IMDb ratings):",
      "omdb_guide_step1": "Go to {{url}}",
      "omdb_guide_step2": "Choose 'FREE' and enter your email",
      "omdb_guide_step3": "Check your inbox and click the activation link",
      "omdb_guide_step4": "Copy the key provided in the email here."
    },
    "appearance": {
      "title": "Application Appearance",
      "desc": "Customize the look and feel of RENDA to match your workspace.",
      "theme_section": "THEME & STYLE",
      "theme_label": "Application Theme:",
      "interface_section": "INTERFACE DETAILS",
      "interface_desc": "Modern Lucide icons are used throughout the application to ensure clarity.",
      "themes": {
        "dark": "Standard Dark (Pro)",
        "light": "Standard Light (Coming Soon)",
        "amoled": "AMOLED Black (Coming Soon)"
      }
    },
    "advanced": {
      "title": "Danger Zone",
      "desc": "Destructive actions and low-level system operations.",
      "wipe_label": "Factory Reset Database",
      "wipe_hint": "This will permanently delete all scanned files, libraries, matches, and history. Physical media files will not be affected. Keys and settings are preserved.",
      "wipe_btn": "Wipe Everything"
    },
    "general": {
      "title": "General Settings",
      "desc": "Configure core application behavior, appearance, and directories.",
      "user_name_label": "Display Name",
      "user_name_hint": "Your personalized name for the dashboard greeting.",
      "ui_lang_label": "Interface Language",
      "ui_lang_hint": "The primary language for the RENDA user interface.",
      "scan_dir_label": "Default Scan Directory",
      "scan_dir_hint": "The primary folder to scan when adding new media.",
      "browse": "Browse",
      "meta_lang_label": "Metadata Languages",
      "meta_lang_hint": "Primary and fallback languages for fetching metadata (e.g. TMDB).",
      "primary": "Primary",
      "fallback": "Fallback"
    }
  },
  "alerts": {
    "metadata_failed": "Failed to fetch full metadata",
    "wipe_db_title": "Factory Reset Database",
    "wipe_db_msg": "Are you absolutely sure you want to clear the entire database? This cannot be undone.",
    "delete_title": "Delete Item",
    "delete_msg": "Are you sure you want to delete this item from the database?",
    "bulk_delete_title": "Bulk Delete",
    "bulk_delete_msg": "Are you sure you want to delete {{count}} selected items from the database?"
  },
  "extras": {
    "categories": {
      "image": "Images",
      "metadata": "Metadata",
      "video": "Bonus Videos",
      "subtitle": "Subtitles",
      "audio": "Audio Tracks"
    }
  },
  "setup": {
    "title": "Welcome to RENDA",
    "subtitle": "Before we start, what should I call you?",
    "input_placeholder": "Enter your name",
    "button": "Get Started"
  },
  "inspector": {
    "select_item": "Select an item to see details",
    "details": "Details",
    "media_alt": "Media Preview",
    "path": "Original Path",
    "planned": "Planned Path",
    "resolution": "Resolution",
    "duration": "Duration",
    "codecs": "Codecs",
    "check_metadata": "Check Full Metadata"
  }
};

export default en;
