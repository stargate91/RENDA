import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path
from app.scanner.scanner_manager import ScannerManager
from app.db.models import MediaItem, ExtraFile, ItemType, ExtraCategory, ItemStatus

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def enricher(mock_db):
    return ScannerManager(mock_db)

def test_nfo_prioritization_and_chaos(enricher):
    """Teszt: NFO IMDb ID megtalálása zajos fájlban."""
    with patch("pathlib.Path.exists", return_value=True), \
         patch("pathlib.Path.read_text", return_value="Random text <url>http://imdb.com/title/tt0111161/</url> more junk tt9999999"):
        
        item = MediaItem(original_path="movie.mkv", filename="movie.mkv")
        enricher.nfo_parser.get_imdb_id = MagicMock(return_value="tt0111161")
        
        # Ha megvan az IMDb ID, a Guessit-nek nem szabadna lefutnia a fő itemre
        with patch.object(enricher.analyzer, 'get_triple_data') as mock_triple:
            enricher.enrich_all([item])
            assert item.nfo_imdb_id == "tt0111161"
            mock_triple.assert_not_called()

def test_ffprobe_internal_title_parsing(enricher):
    """Teszt: Belső cím kinyerése és elemzése."""
    mock_probe_data = {
        "format": {
            "duration": "3600.5",
            "tags": {"title": "Braveheart.1995.DIRECTORS.CUT"}
        },
        "streams": [
            {"codec_type": "video", "width": 1920, "height": 1080, "codec_name": "h264"}
        ]
    }
    
    with patch.object(enricher.prober, 'probe', return_value=mock_probe_data):
        item = MediaItem(original_path="bh.mkv", filename="bh.mkv", folder_name="Movies")
        enricher.enrich_all([item])
        
        assert item.internal_title == "Braveheart.1995.DIRECTORS.CUT"
        assert item.it_title == "Braveheart"
        assert item.it_year == 1995
        assert item.resolution == "1920x1080"

def test_triple_parsing_from_folder_only(enricher):
    """Teszt: Ha a fájlnév semmitmondó, a mappanév menti meg a helyzetet."""
    item = MediaItem(
        original_path="path/to/Interstellar (2014)/video.mkv", 
        filename="video.mkv", 
        folder_name="Interstellar (2014)"
    )
    
    # Mockoljuk az FFmpeg-et üresre
    with patch.object(enricher.prober, 'probe', return_value={}):
        enricher.enrich_all([item])
        
        # A fájlnév (video.mkv) nem mond semmit
        assert item.fn_title is None or item.fn_title == "video"
        # De a mappanév igen!
        assert item.fd_title == "Interstellar"
        assert item.fd_year == 2014

def test_extra_language_extraction(enricher):
    """Teszt: Felirat nyelvének kitalálása komplex névből."""
    item = MediaItem(original_path="movie.mkv", filename="movie.mkv")
    extra = ExtraFile(
        original_path="movie.2024.hun-eng.forced.srt", 
        category=ExtraCategory.SUBTITLE
    )
    item.extras = [extra]
    
    with patch.object(enricher.prober, 'probe', return_value={}):
        enricher.enrich_all([item])
        
        # A Guessit-nek fel kell ismernie a 'hun' vagy 'hu' kódot
        assert extra.language in ['hu', 'hun']

def test_ffprobe_failure_graceful_handling(enricher):
    """Teszt: Ha az FFmpeg besül, nem omlik össze a rendszer."""
    with patch.object(enricher.prober, 'probe', side_effect=Exception("FFmpeg crashed!")):
        item = MediaItem(original_path="corrupt.mkv", filename="corrupt.mkv")
        
        # Nem szabadna hibát dobnia, csak logolnia (vagy csendben maradnia)
        try:
            enricher.enrich_all([item])
        except Exception as e:
            pytest.fail(f"A rendszer összeomlott FFmpeg hiba esetén: {e}")
        
        assert item.status == ItemStatus.ERROR # Hiba esetén ERROR állapotba kerül

def test_total_identity_crisis(enricher):
    """
    A 'Végső Kibaszás': minden forrás mást mond, nézzük a prioritásokat.
    """
    # 1. Beállítások
    item = MediaItem(
        original_path="Empire.Strikes.Back.Part1.mkv",
        filename="Empire.Strikes.Back.Part1.mkv",
        folder_name="Star.Wars.Collection"
    )
    # Van egy felirat is
    extra = ExtraFile(
        original_path="Empire.Strikes.Back.1980.PROPER.HUN.forced-subs.srt",
        category=ExtraCategory.SUBTITLE
    )
    item.extras = [extra]

    # 2. Mock-oljuk az NFO-t (Hibás ID-val, de az NFO az úr!)
    with patch.object(enricher.nfo_parser, 'get_imdb_id', return_value="tt0086190"), \
         patch.object(enricher.prober, 'probe', return_value={
             "format": {"tags": {"title": "Episode V - The Empire Strikes Back"}},
             "streams": []
         }):
        
        # 3. Futtatás
        enricher.enrich_all([item])

        # 4. Ellenőrzés
        # Az IMDb ID-nak meg kell lennie
        assert item.nfo_imdb_id == "tt0086190"
        
        # A belső címnek is meg kell lennie az FFmpeg-ből
        assert item.internal_title == "Episode V - The Empire Strikes Back"
        
        # DE! Mivel volt IMDb ID, a Guessit mezőknek ÜRESNEK kell lenniük a fő fájlnál
        # (Ez bizonyítja, hogy nem pazaroltunk időt a Guessit-re)
        assert item.fn_title is None
        assert item.fd_title is None
        
        # VISZONT az extra fájl nyelvét meg kellett találnia a Guessit-nek!
        assert extra.language == "hu"
