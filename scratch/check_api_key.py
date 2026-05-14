from app.db.base import Session
from app.db.models import UserSetting

db = Session()
try:
    key = db.query(UserSetting).filter(UserSetting.key == "tmdb_api_key").first()
    if key:
        print(f"API KEY: {key.value[:4]}...{key.value[-4:] if len(key.value) > 8 else ''}")
    else:
        print("API KEY NOT FOUND")
finally:
    db.close()
