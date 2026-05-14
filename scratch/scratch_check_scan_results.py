from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.db.models import MediaItem, ItemStatus, ExtraFile

engine = create_engine("sqlite:///data/renda.db")

with Session(engine) as session:
    print("--- Media Items ---")
    counts = session.query(MediaItem.status, func.count(MediaItem.id)).group_by(MediaItem.status).all()
    if not counts:
        print("No media items found.")
    for status, count in counts:
        print(f"{status.value}: {count}")
    
    print("\n--- Recent 5 Media Items ---")
    recent = session.query(MediaItem).order_by(MediaItem.created_at.desc()).limit(5).all()
    for item in recent:
        print(f"ID: {item.id}, Status: {item.status.value}, Filename: {item.filename}")

    print("\n--- Extra Files ---")
    extra_count = session.query(ExtraFile).count()
    print(f"Total extras: {extra_count}")
