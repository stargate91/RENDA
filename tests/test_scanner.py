import pytest
import os
from pathlib import Path
from app.scanner.collector import Collector
from app.scanner.categorizer import Categorizer
from app.scanner.linker import Linker
from app.db.models import ExtraCategory, ExtraSubtype

@pytest.fixture
def creative_workspace(tmp_path):
    """Létrehoz egy "gonosz" teszt mappaszerkezetet."""
    
    def write_safe(path, content="small", size_kb=None):
        path.parent.mkdir(parents=True, exist_ok=True)
        if size_kb:
            path.write_text("X" * (size_kb * 1024))
        else:
            path.write_text(content)

    # 1. Név-ütközés: Melyik évhez tartozik a trailer?
    year_clash = tmp_path / "YearClash"
    write_safe(year_clash / "Avatar (2009).mkv", size_kb=10)
    write_safe(year_clash / "Avatar (2022).mkv", size_kb=10)
    write_safe(year_clash / "Avatar (2022)-trailer.mp4") # Pontos egyezés kell!
    
    # 2. Hasonmás: Ugyanaz a név, más kiterjesztés/méret
    double_dir = tmp_path / "Double"
    write_safe(double_dir / "Inception.mkv", size_kb=10)
    write_safe(double_dir / "Inception.mp4") # Ez extra kell legyen (pl. minta)
    
    # 3. Zombi fájl (0 byte)
    write_safe(tmp_path / "zombie.mkv", content="")
    
    # 4. Long Path
    long_dir = tmp_path / ("A" * 30) / ("B" * 30) / ("C" * 30) / ("D" * 30)
    write_safe(long_dir / "long_path_movie.mkv", size_kb=10)
    write_safe(long_dir / "extra.srt")
    
    # 5. "Testvér" mappa (Sibling folder)
    sibling_base = tmp_path / "Siblings"
    write_safe(sibling_base / "Matrix" / "Matrix.mkv", size_kb=10)
    write_safe(sibling_base / "Matrix-Extras" / "trailer.mp4")
    
    return tmp_path

def test_clash_resolution(creative_workspace):
    collector = Collector(min_video_size_mb=0.005)
    files = collector.collect([str(creative_workspace)])
    media = files["potential_media"]
    extras = files["potential_extras"]
    
    linker = Linker()
    links = linker.link(media, extras)
    
    avatar_trailer = [e for e in extras if "Avatar (2022)-trailer.mp4" in str(e)][0]
    parent = links[avatar_trailer]
    assert "Avatar (2022).mkv" in parent.name

def test_double_name_different_size(creative_workspace):
    collector = Collector(min_video_size_mb=0.005)
    files = collector.collect([str(creative_workspace)])
    
    media_names = [p.name for p in files["potential_media"]]
    extra_names = [p.name for p in files["potential_extras"]]
    
    assert "Inception.mkv" in media_names
    assert "Inception.mp4" in extra_names

def test_zombie_file(creative_workspace):
    collector = Collector(min_video_size_mb=0.005)
    files = collector.collect([str(creative_workspace)])
    
    extra_names = [p.name for p in files["potential_extras"]]
    assert "zombie.mkv" in extra_names

def test_long_path(creative_workspace):
    collector = Collector(min_video_size_mb=0.005)
    files = collector.collect([str(creative_workspace)])
    
    linker = Linker()
    links = linker.link(files["potential_media"], files["potential_extras"])
    
    extra_srt = [e for e in files["potential_extras"] if "extra.srt" in str(e)][0]
    assert "long_path_movie.mkv" in links[extra_srt].name

def test_sibling_folders(creative_workspace):
    collector = Collector(min_video_size_mb=0.005)
    files = collector.collect([str(creative_workspace)])
    
    linker = Linker()
    links = linker.link(files["potential_media"], files["potential_extras"])
    
    sibling_extra = [e for e in files["potential_extras"] if "trailer.mp4" in str(e) and "Matrix" in str(e)][0]
    
    # Ez jelzi, ha a Linker nem találta meg a szomszéd mappában
    assert sibling_extra in links
    assert "Matrix.mkv" in links[sibling_extra].name
