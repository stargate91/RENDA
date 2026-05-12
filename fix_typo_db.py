from app.db.base import Session
from app.db.models import UserSetting

db = Session()
try:
    s = db.query(UserSetting).filter(UserSetting.key == "extras_audio_template").first()
    if s and "{{{SubCategory}}" in s.value:
        s.value = s.value.replace("{{{SubCategory}}", "{{SubCategory}}")
        db.commit()
        print("Fixed extras_audio_template typo in DB.")
    else:
        print("No typo found or setting missing.")
finally:
    db.close()
