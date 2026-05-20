import pytest
from unittest.mock import MagicMock, patch
from app.resolver.resolver import Resolver
from app.db.models import MediaItem, ItemStatus, MediaMatch

@pytest.fixture
def mock_db():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    return db

@pytest.fixture
def resolver(mock_db):
    return Resolver(mock_db)

def test_resolve_single_match(resolver):
    """Teszt: Ha minden forrás ugyanazt az 1 filmet találja meg."""
    item = MediaItem(id=1, fn_title="Inception", fn_year=2010)
    
    # Mockoljuk a TMDB választ (A fájlnév és a mappanév is ugyanazt adja vissza)
    mock_results = [{"id": 27205, "title": "Inception", "release_date": "2010-07-15"}]
    
    with patch.object(resolver.api, 'search', return_value=mock_results):
        resolver.resolve_item(item)
        
        # Ellenőrizzük, hogy MATCHED lett-e
        assert item.status == ItemStatus.MATCHED
        # Ellenőrizzük a mentési hívásokat (1 MediaMatch-et kellene hozzáadnia)
        added_objects = [call.args[0] for call in resolver.db.add.call_args_list]
        matches = [obj for obj in added_objects if isinstance(obj, MediaMatch)]
        assert len(matches) == 1
        assert matches[0].tmdb_id == 27205
        assert matches[0].is_active is True

def test_resolve_multiple_matches(resolver):
    """Teszt: Ha több különböző találat érkezik."""
    item = MediaItem(id=1, fn_title="Avatar Collection")
    
    # Két különböző Avatar film
    mock_results = [
        {"id": 19995, "title": "Avatar", "release_date": "2009-12-18"},
        {"id": 76600, "title": "Avatar: The Way of Water", "release_date": "2022-12-14"}
    ]
    
    with patch.object(resolver.api, 'search', return_value=mock_results):
        resolver.resolve_item(item)
        
        # Több találat esetén MULTIPLE státusz kell
        assert item.status == ItemStatus.MULTIPLE
        
        added_objects = [call.args[0] for call in resolver.db.add.call_args_list]
        matches = [obj for obj in added_objects if isinstance(obj, MediaMatch)]
        assert len(matches) == 2

def test_resolve_by_imdb_id(resolver):
    """Teszt: Ha van IMDb ID, az az elsődleges."""
    item = MediaItem(id=1, nfo_imdb_id="tt0111161", fn_title="The Shawsank Redemption")
    
    mock_find_res = {"id": 278, "title": "The Shawshank Redemption", "item_type": "movie"}
    
    with patch.object(resolver.api, 'find_by_imdb', return_value=mock_find_res), \
         patch.object(resolver.api, 'search') as mock_search:
        
        resolver.resolve_item(item)
        
        assert item.status == ItemStatus.MATCHED
        # Ha megvan IMDb alapján, ne is keressen tovább a címekre!
        mock_search.assert_not_called()
        
        added_objects = [call.args[0] for call in resolver.db.add.call_args_list]
        matches = [obj for obj in added_objects if isinstance(obj, MediaMatch)]
        assert matches[0].tmdb_id == 278

def test_resolve_uncertain_match(resolver):
    """Teszt: Ha 1 találat van, de az évszám nem stimmel."""
    item = MediaItem(id=1, fn_title="Avatar Movie", fn_year=2000) # Elírt évszám
    
    # TMDB 2009-es Avatart ad vissza
    mock_results = [{"id": 19995, "title": "Avatar", "release_date": "2009-12-18"}]
    
    with patch.object(resolver.api, 'search', return_value=mock_results):
        resolver.resolve_item(item)
        
        # 2000 vs 2009 -> UNCERTAIN kell legyen
        assert item.status == ItemStatus.UNCERTAIN
