const en = {
  "_lang_name": "English",
  "common": {
    "save": "Save Changes",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "play": "Play"
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
    "wiping": "Clearing library",
    "undoing": "Undoing Operations",
    "organizing": "Organizing Library",
    "idle": "Idle"
  },
  "sidebar": {
    "dashboard": "Dashboard",
    "discovery": "Discovery",
    "library": "Library",
    "lists": "Lists",
    "history": "History",
    "settings": "Settings"
  },
  "navigation": {
    "library": "Media Library"
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
      "unmatched_sub": "Pending in Discovery",
      "library_dna": "Library DNA",
      "timeline": "Time-Travel Timeline",
      "top_decade": "You are a {{decade}} fanatic!"
    },
    "watchlist": {
      "add": "Watchlist",
      "add_short": "Watch",
      "success": "Added to your Watchlist!"
    },
    "recommendations": {
      "genre": "Because you like {{genre}}..."
    }
  },
  "discovery": {
    "title": "Discovery Console",
    "found_items": "Found {{count}} new items.",
    "scan_now": "Browse & Scan",
    "background_images": "Fetching Images",
    "reveal_explorer": "Show in Folder",
    "refresh": "Refresh",
    "organize_now": "Organize Library",
    "organizing": "Organizing...",
    "organize_disabled_collision": "Naming collision detected. Resolve before organizing.",
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
      "pending_match": "Identify Media",
      "will_delete": "WILL BE DELETED"
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
  "history": {
    "title": "Organization History",
    "subtitle": "Track and manage past library organization tasks. Revert any batch with a single click.",
    "empty": "No history records found. Start organizing your library to see past activity here.",
    "items_count": "{{count}} items processed",
    "undo_action": "Undo This Batch",
    "undone": "Undone"
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
    "bulk_delete_msg": "Are you sure you want to delete {{count}} selected items from the database?",
    "undo_title": "Undo Organization",
    "undo_msg": "Are you sure you want to revert this entire organization batch? All files will be moved back to their original locations."
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
  },
  "library": {
    "filter_tags": "Filter by Tags:",
    "clear_filters": "Clear Filters",
    "items_count": "{{count}} items in your organized collection",
    "no_items": "No organized items yet.",
    "go_back": "Go Back",
    "could_not_load": "Could not load details.",
    "select_featured_actors": "Select Featured Actors",
    "select_featured_directors": "Select Featured Directors",
    "no_search_results": "No results for your search",
    "collection_empty": "Your collection is empty",
    "manage_actors": "Manage Actors",
    "manage_directors": "Manage Directors",
    "local_catalog": "Local Catalog",
    "search_tmdb_api": "Search TMDB API",
    "search_tmdb_actors_placeholder": "Search TMDB for actors...",
    "search_tmdb_directors_placeholder": "Search TMDB for directors...",
    "search": "Search",
    "added": "Added",
    "add": "Add",
    "no_tmdb_results": "No results found on TMDB",
    "search_name_discover": "Search by name to discover performers",
    "search_all_actors_placeholder": "Search all actors...",
    "search_all_directors_placeholder": "Search all directors...",
    "sort_by": "SORT BY",
    "frequency": "Frequency",
    "popularity": "Popularity",
    "name": "Name",
    "item_count_singular": "1 item",
    "item_count_plural": "{{count}} items",
    "remove_favorites": "Remove from Favorites",
    "mark_favorite": "Mark as Favorite",
    "remove_library": "Remove from Library",
    "add_library": "Add to Library",
    "no_matched_people": "No matched people found.",
    "new_tag_prefix": "New Tag",
    "create_tag": "Create Tag",
    "no_tags_found": "No Tags Found",
    "no_tags_matching": "No tags matching \"{{query}}\".",
    "no_tags_yet": "You don't have any custom tags yet.",
    "edit_tag": "Edit Tag",
    "delete_tag": "Delete Tag",
    "tag_name_label": "TAG NAME",
    "color_label": "COLOR",
    "save": "Save",
    "cancel": "Cancel",
    "tagged_item_singular": "1 tagged item",
    "tagged_item_plural": "{{count}} tagged items",
    "click_collapse": "Click to collapse details",
    "click_show_tagged": "Click to show tagged items",
    "items_tagged_with": "Items tagged with \"{{tag}}\"",
    "no_tagged_items_yet": "No items associated with this tag yet.",
    "select_items": "Select Items",
    "exit_selection_mode": "Exit Select"
  },
  "detail": {
    "watchlist": {
      "desc": "Your default system watchlist for movies and series."
    },
    "play_trailer": "Play Trailer",
    "cast": "Cast",
    "series_cast": "Series Cast",
    "directors": "Directors",
    "technical_info": "Technical Info",
    "your_rating": "Your Rating",
    "known_for": "Known for",
    "born": "Born",
    "died": "Died",
    "popularity": "Popularity",
    "choose_profile": "Choose Profile Image",
    "select_portrait": "Select a custom portrait for {{name}}",
    "upload_file": "Upload File",
    "set_url": "Set via URL",
    "in_library": "In Library",
    "missing": "Missing",
    "hide_missing": "Hide Missing",
    "show_missing": "Show Missing ({{count}})",
    "movies_library_status": "Movies ({{library}} / {{total}} in Library)",
    "series_library_status": "TV Series ({{library}} / {{total}} in Library)",
    "no_movies_library": "No movies from this person in your library. Click \"Show Missing\" to view their complete filmography.",
    "no_series_library": "No series from this person in your library. Click \"Show Missing\" to view their complete filmography.",
    "tags": {
      "add": "Add Tag",
      "cancel": "Cancel",
      "search_placeholder": "Search or create tag...",
      "available": "Available Tags",
      "create_hint": "Press enter to create new tag",
      "none_available": "No pre-created tags available"
    },
    "lists": {
      "title": "Add to Lists",
      "none": "No custom lists created.",
      "create_new": "Create New List",
      "new_placeholder": "Enter list name..."
    }
  },
  "resolver": {
    "correct_match": "Correct Match"
  },
  "alerts": {
    "delete_tag_title": "Delete Custom Tag",
    "delete_tag_msg": "Are you sure you want to permanently delete this custom tag? This action cannot be undone and the tag will be removed from all associated media items."
  },
  "library": {
    "exit_selection_mode": "Exit Selection",
    "select_items": "Select Items",
    "manage_tags": "Manage Tags",
    "bulk_manage_tags": "Bulk Manage Tags",
    "new_tag_label": "NEW TAG (OPTIONAL)",
    "new_tag_placeholder": "Enter tag name...",
    "apply_changes": "Apply Changes",
    "cancel": "Cancel"
  }
};

export default en;
