from app.db.base import Session
from app.db.models import UserSetting

db = Session()
try:
    key_setting = db.query(UserSetting).filter(UserSetting.key == "tmdb_api_key").first()
    if key_setting:
        key_setting.value = "f1065eab900ebbda0e3d09f948d581e0"
    else:
        key_setting = UserSetting(key="tmdb_api_key", value="f1065eab900ebbda0e3d09f948d581e0")
        db.add(key_setting)
    db.commit()
    print("TMDB API Key restored successfully!")
finally:
    db.close()
