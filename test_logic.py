from app.db.base import Session
from app.db.models import MediaItem, ItemType

db = Session()
item = db.query(MediaItem).filter(MediaItem.fn_year == 1969).first()
has_season = bool(item.fn_season or item.fd_season or item.it_season)
has_episode_num = bool(item.fn_episode or item.fd_episode or item.it_episode)
tmdb_title = 'Stargate SG-1'
parsed_title = item.fn_title or item.fd_title or item.it_title
is_exact_title = False
if tmdb_title and parsed_title and tmdb_title.lower().strip() == parsed_title.lower().strip():
    is_exact_title = True

print(f'type:{item.item_type}')
print(f'exact:{is_exact_title}')
print(f'season:{has_season}')
print(f'ep:{has_episode_num}')
print(f'status_should_be_matched:{(item.item_type in (ItemType.SERIES, ItemType.EPISODE) and is_exact_title and has_season and has_episode_num)}')
