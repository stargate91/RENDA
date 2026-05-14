from app.db.base import Session
from app.db.models import UserSetting

db = Session()
try:
    settings = db.query(UserSetting).filter(UserSetting.key.like("extras_%")).all()
    print("EXTRAS SETTINGS:")
    for s in settings:
        print(f"  {s.key}: {s.value}")
finally:
    db.close()
