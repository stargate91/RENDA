import sys
from dataclasses import dataclass, field
from typing import Any, List
if sys.platform == "win32":
    import io; sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.formatter.formatter import Formatter, FormatterConfig, Casing, Separator

# Mock objektumok a teszthez
@dataclass
class MockEnum:
    value: str

@dataclass
class MockItem:
    resolution: str = "1080p"
    video_codec: str = "x264"
    audio_codec: str = "AAC"
    audio_channels: str = "5.1"
    bit_depth: int = 8
    hdr_type: str = "SDR"
    extension: str = ".mkv"
    edition: Any = field(default_factory=lambda: MockEnum("none"))
    audio_type: Any = field(default_factory=lambda: MockEnum("none"))
    source: Any = field(default_factory=lambda: MockEnum("none"))
    part: int = None
    part_type: Any = None
    part_style: Any = None

@dataclass
class MockMatch:
    tmdb_id: int = 123
    series_tmdb_id: int = 456
    season_tmdb_id: int = 789
    imdb_id: str = "tt12345"
    rating_imdb: float = 8.5
    item_type: Any = field(default_factory=lambda: MockEnum("episode"))
    season_number: int = 1
    episode_number: int = 3
    episode_count: int = 10
    number_of_seasons: int = 2
    number_of_episodes: int = 20
    first_air_date: Any = None
    last_air_date: Any = None
    season_air_date: Any = None
    episode_air_date: Any = None
    release_status: str = "Returning Series"
    series_type: str = "Scripted"
    director: str = "Craig Mazin"
    networks: list = field(default_factory=lambda: [])

@dataclass
class MockLoc:
    series_title: str = "The Last of Us"
    original_series_title: str = "The Last of Us"
    season_title: str = "Season 1"
    original_season_title: str = "Season 1"
    episode_title: str = "Long, Long Time"
    original_title: str = "Long, Long Time"

def test_tv_formatter():
    print("\n=== TV FORMATTER TESZT ===\n")
    
    f = Formatter(FormatterConfig())
    item = MockItem()
    match = MockMatch()
    loc = MockLoc()
    
    # Context építés (egy epizódhoz)
    ctx = f.build_tv_context(item, match, loc)
    
    print(f"Series Folder:  {f.format_series_foldername(ctx)}")
    print(f"Season Folder:  {f.format_season_foldername(ctx)}")
    print(f"Episode File:   {f.format_episode_filename(ctx)}")

    # Mixed felbontás teszt (Season mappához)
    print("\nMixed Resolution Teszt:")
    child1 = MockItem(resolution="720p")
    child2 = MockItem(resolution="1080p")
    child3 = MockItem(resolution="2160p")
    
    ctx_mixed2 = f.build_tv_context(item, match, loc, children=[child1, child2])
    print(f"  2 féle (720+1080): {ctx_mixed2['resolution']} (Várt: 720p-1080p)")
    
    ctx_mixed3 = f.build_tv_context(item, match, loc, children=[child1, child2, child3])
    print(f"  3 féle: {ctx_mixed3['resolution']} (Várt: Mixed)")

    # Status és Network teszt
    match.networks = ["HBO", "Warner"]
    ctx_full = f.build_tv_context(item, match, loc)
    f_full = Formatter(FormatterConfig(series_folder="{series_title} [{series_status}] [{networks}]"))
    print(f"\nSeries Full: {f_full.format_series_foldername(ctx_full)}")

if __name__ == "__main__":
    test_tv_formatter()
