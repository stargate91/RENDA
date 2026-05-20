import sys
from dataclasses import dataclass, field
from typing import Any, List, Optional
if sys.platform == "win32":
    import io; sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.formatter.formatter import Formatter, FormatterConfig, Casing, Separator, ExtraOrg

# --- MOCK INFRASTRUKTÚRA ---
@dataclass
class MockEnum:
    value: str

@dataclass
class MockItem:
    resolution: Optional[str] = "1080p"
    video_codec: Optional[str] = "x264"
    audio_codec: Optional[str] = "AAC"
    audio_channels: Optional[str] = "5.1"
    bit_depth: Optional[int] = 8
    hdr_type: Optional[str] = "SDR"
    extension: str = ".mkv"
    edition: Any = field(default_factory=lambda: MockEnum("none"))
    audio_type: Any = field(default_factory=lambda: MockEnum("none"))
    source: Any = field(default_factory=lambda: MockEnum("none"))
    part: Optional[int] = None
    part_type: Any = field(default_factory=lambda: MockEnum("none"))
    part_style: Any = field(default_factory=lambda: MockEnum("arabic"))

@dataclass
class MockMatch:
    tmdb_id: Optional[int] = 123
    series_tmdb_id: Optional[int] = 456
    season_tmdb_id: Optional[int] = 789
    imdb_id: str = "tt12345"
    rating_imdb: Optional[float] = 8.5
    item_type: Any = field(default_factory=lambda: MockEnum("movie"))
    release_date: Any = None
    first_air_date: Any = None
    last_air_date: Any = None
    season_air_date: Any = None
    episode_air_date: Any = None
    release_status: str = "Released"
    series_type: str = "Scripted"
    director: Optional[str] = None
    networks: list = field(default_factory=lambda: [])
    collection: Optional[str] = None
    season_number: int = 1
    episode_number: int = 1
    episode_count: int = 1
    number_of_seasons: int = 1
    number_of_episodes: int = 1

@dataclass
class MockLoc:
    title: str = ""
    original_title: str = ""
    series_title: str = ""
    original_series_title: str = ""
    season_title: str = ""
    original_season_title: str = ""
    episode_title: str = ""

# --- A TESZTEK ---

def run_hell_test():
    f = Formatter(FormatterConfig(casing=Casing.TITLE, separator=Separator.SPACE))
    
    print("\n=== STRESSZ TESZT: A POKOL KUTYÁI ===\n")

    # 1. Gonosz karakterek és üres adatok
    print("1. Tiltott karakterek + Hiányzó év:")
    item = MockItem()
    match = MockMatch(release_date=None) # NINCS ÉV
    loc = MockLoc(title="Star Wars: Episode VI? *Really*|")
    ctx = f.build_movie_context(item, match, loc)
    # A template-ben van év zárójelben, de nincs adat
    res = f.format_movie_filename(ctx)
    print(f"  Bemenet: {loc.title} (Nincs év)")
    print(f"  Kimenet: {res}") 

    # 2. Extrém Part numbering
    print("\n2. Extrém Part numbering (Roman/Alpha):")
    from app.db.models import PartStyle, PartType
    item_roman = MockItem(part=14, part_style=PartStyle.ROMAN, part_type=PartType.PART)
    ctx_roman = f.build_movie_context(item_roman, match, loc)
    print(f"  Part 14 (ROMAN): {ctx_roman['PartType']} {ctx_roman['Part']}")
    
    item_alpha = MockItem(part=27, part_style=PartStyle.ALPHA, part_type=PartType.PART)
    ctx_alpha = f.build_movie_context(item_alpha, match, loc)
    print(f"  Part 27 (ALPHA): {ctx_alpha['PartType']} {ctx_alpha['Part']}")

    # 3. TV Hierarchia - A futó sorozat csapdája
    print("\n3. Futó sorozat (Nincs last_air_year):")
    match_tv = MockMatch(item_type=MockEnum("series"), release_status="Returning Series")
    import datetime
    match_tv.first_air_date = datetime.date(2023, 1, 15)
    loc_tv = MockLoc(series_title="The Last of Us")
    # Template: {series_title} ({year}-{last_air_year})
    f.config.series_folder = "{series_title} ({year}-{last_air_year})"
    ctx_tv = f.build_tv_context(item, match_tv, loc_tv)
    print(f"  Kimenet: {f.format_series_foldername(ctx_tv)}")

    # 4. Extra fájlok "mocska"
    print("\n4. Extrák szűrője (Redundáns Metadata):")
    @dataclass
    class MockExtra:
        category: Any = field(default_factory=lambda: MockEnum("metadata"))
        subtype: Any = field(default_factory=lambda: MockEnum("nfo"))
        extension: str = ".nfo"
        language: str = ""

    extra = MockExtra()
    # Template: {parent_name}-{sub_category}
    ctx_extra = f.build_extra_context(extra, "The Matrix (1999)")
    res_extra = f.format_extra_filename(ctx_extra)
    print(f"  Bemenet: parent='The Matrix', cat='Metadata', sub='nfo'")
    print(f"  Kimenet: {res_extra}")

    # 5. Casing + Separator "mészárlás"
    print("\n5. TITLE casing + DOT separator + Sok meglévő pont:")
    f_evil = Formatter(FormatterConfig(casing=Casing.TITLE, separator=Separator.DOT))
    loc_dot = MockLoc(title="movie.title.with.lots.of.dots")
    ctx_dot = f_evil.build_movie_context(item, match, loc_dot)
    print(f"  Kimenet: {f_evil.format_movie_filename(ctx_dot)}")

    # 6. Szuper-hosszú cím (Windows MAX_PATH teszt)
    print("\n6. Szuper-hosszú cím (300+ karakter):")
    long_title = "A" * 300
    loc_long = MockLoc(title=long_title)
    ctx_long = f.build_movie_context(item, match, loc_long)
    res_long = f.format_movie_filename(ctx_long)
    print(f"  Hossz: {len(res_long)} karakter")

    # 7. Unicode Káosz
    print("\n7. Unicode Káosz (Kínai, Arab, Emoji):")
    loc_uni = MockLoc(title="映画 ⚡ The Matrix 100% 🔥 (2024) لا")
    ctx_uni = f.build_movie_context(item, match, loc_uni)
    print(f"  Kimenet: {f.format_movie_filename(ctx_uni)}")

    # 8. Minden metaadat üres (Csak kiterjesztés)
    print("\n8. Minden metaadat üres:")
    loc_empty = MockLoc(title="", original_title="")
    match_empty = MockMatch(release_date=None, imdb_id="")
    ctx_empty = f.build_movie_context(item, match_empty, loc_empty)
    print(f"  Kimenet: '{f.format_movie_filename(ctx_empty)}'")

    # 9. Kiterjesztés nélküli fájl
    print("\n9. Kiterjesztés nélküli fájl:")
    item_no_ext = MockItem(extension="")
    ctx_no_ext = f.build_movie_context(item_no_ext, match, loc)
    print(f"  Kimenet: {f.format_movie_filename(ctx_no_ext)}")

    # 10. COLLISION MANAGER TESZT
    print("\n10. COLLISION MANAGER TESZT:")
    from app.formatter.formatter import RenamePreview
    
    previews = [
        # Két ütköző film
        RenamePreview(1, "path/1.mkv", "The Matrix (1999).mkv", "Movies", "movie"),
        RenamePreview(2, "path/2.mkv", "the matrix (1999).mkv", "Movies", "movie"), # Case insensitive ütközés!
        
        # Három azonos nevű extra
        RenamePreview(3, "path/sub1.srt", "subtitle.srt", "Movies/The Matrix", "extra"),
        RenamePreview(4, "path/sub2.srt", "subtitle.srt", "Movies/The Matrix", "extra"),
        RenamePreview(5, "path/sub3.srt", "subtitle.srt", "Movies/The Matrix", "extra"),
        
        # Egy békés, magányos epizód
        RenamePreview(6, "path/ep1.mkv", "S01E01.mkv", "Series/Show", "episode")
    ]
    
    f.resolve_collisions(previews)
    
    print("\n  Filmek ütközése (Case Insensitive):")
    for p in previews[:2]:
        print(f"    ID {p.item_id}: {p.target_name} | Collision: {p.has_collision} | Group: {p.collision_group_id}")
    
    print("\n  Extrák sorszámozása:")
    for p in previews[2:5]:
        print(f"    ID {p.item_id}: {p.target_name} | Collision: {p.has_collision}")

    print("\n  Békés epizód:")
    print(f"    ID {p.item_id}: {previews[5].target_name} | Collision: {previews[5].has_collision}")

if __name__ == "__main__":
    run_hell_test()
