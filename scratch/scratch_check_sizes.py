from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.db.models import MediaItem

engine = create_engine("sqlite:///data/renda.db")

with Session(engine) as session:
    items = session.query(MediaItem).limit(10).all()
    for item in items:
        print(f"File: {item.filename}, Size: {item.size / (1024*1024):.2f} MB")
