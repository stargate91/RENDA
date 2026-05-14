from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.db.models import MediaItem

engine = create_engine("sqlite:///data/renda.db")

with Session(engine) as session:
    item = session.query(MediaItem).filter(MediaItem.id == 11).first()
    if item:
        print(f"Item: {item.filename}")
        print(f"  Resolution: {item.resolution}")
        print(f"  Duration: {item.duration}")
        print(f"  Video Codec: {item.video_codec}")
        print(f"  Audio Codec: {item.audio_codec}")
    else:
        print("Item 11 not found")
