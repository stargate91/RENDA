# RENDA

RENDA is a high-fidelity media identification, enrichment, and physical organization pipeline designed for large-scale video libraries. It automates the process of scanning raw media files, matching them against online databases, and reorganizing them into a standardized filesystem structure.

## Core Features

- **Automated Scanning**: Recursive discovery of video files and associated extras (subtitles, images, NFOs).
- **Metadata Enrichment**: Integration with TMDB API for multi-language metadata, posters, and person profiles.
- **Intelligent Formatting**: Customizable naming templates for movies, series, seasons, and episodes.
- **Extra File Handling**: Automatic linkage and renaming of supplementary files based on the primary media item.
- **Conflict Resolution**: Advanced detection and resolution of filename collisions, including automated numbering for extra files.
- **Atomic Operations**: Transaction-safe physical file manipulation with integrated database tracking.
- **Full Undo Support**: Reverse entire batch operations to restore original filesystem state and database records.
- **Robustness**: Hardened against Unicode characters, emojis, extremely long paths, and case-sensitivity issues on various filesystems.

## Technical Stack

- **Language**: Python 3.14+
- **Database**: SQLite with SQLAlchemy ORM (Highly indexed for performance)
- **Metadata**: TMDB API
- **Media Probing**: FFmpeg / FFprobe
- **UI Framework**: PyQt6 (Modernized theme engine)

## Project Structure

- `app/db`: Database models and session management.
- `app/scanner`: File discovery, technical probing, and metadata enrichment.
- `app/resolver`: Logic for matching files to media entities and propagation of IDs.
- `app/formatter`: Template rendering and collision detection.
- `app/renamer`: Physical execution engine and action logging.

## Installation

1. Clone the repository.
2. Install dependencies: `pip install -r requirements.txt`.
3. Initialize the database: `python init_db.py`.
4. Configure your TMDB API key in the settings.

## Usage

Start the main application:
```bash
python main.py
```

## Testing

The system includes comprehensive integration tests for edge cases:
- `test_full_pipeline_hell.py`: End-to-end pipeline validation with complex filesystem scenarios.
- `test_undo_hell.py`: Validation of the reversal logic under partial failure conditions.
