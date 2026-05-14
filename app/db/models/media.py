from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, Enum as SQLEnum, JSON, Boolean, BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from .enums import ItemType, ItemStatus, MovieEdition, MediaSource, MediaAudioType, PartType, PartStyle, ExtraCategory, ExtraSubtype

class MediaItem(Base):
    """Level 1: The physical file on the disk."""
    __tablename__ = "media_items"
    id: Mapped[int] = mapped_column(primary_key=True); item_type: Mapped[ItemType] = mapped_column(SQLEnum(ItemType))
    original_path: Mapped[str] = mapped_column(String, nullable=False, index=True)
    current_path: Mapped[str] = mapped_column(String, nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String, index=True); extension: Mapped[str] = mapped_column(String); size: Mapped[int] = mapped_column(BigInteger, default=0, index=True)
    mtime: Mapped[Optional[float]] = mapped_column(Float, index=True) # Last modified time (filesystem)
    folder_name: Mapped[Optional[str]] = mapped_column(String) # Immediate parent directory name
    file_hash: Mapped[Optional[str]] = mapped_column(String, index=True)
    group_hash: Mapped[Optional[str]] = mapped_column(String, index=True) # For linking split files (CD1/CD2)
    nfo_imdb_id: Mapped[Optional[str]] = mapped_column(String); internal_title: Mapped[Optional[str]] = mapped_column(String)
    duration: Mapped[Optional[float]] = mapped_column(Float); resolution: Mapped[Optional[str]] = mapped_column(String)
    video_codec: Mapped[Optional[str]] = mapped_column(String); video_bitrate: Mapped[Optional[int]] = mapped_column(Integer)
    framerate: Mapped[Optional[str]] = mapped_column(String); bit_depth: Mapped[Optional[int]] = mapped_column(Integer)
    hdr_type: Mapped[Optional[str]] = mapped_column(String); audio_codec: Mapped[Optional[str]] = mapped_column(String)
    audio_channels: Mapped[Optional[str]] = mapped_column(String); audio_bitrate: Mapped[Optional[int]] = mapped_column(Integer)
    audio_streams: Mapped[Optional[List[dict]]] = mapped_column(JSON)
    fn_title: Mapped[Optional[str]] = mapped_column(String); fn_year: Mapped[Optional[int]] = mapped_column(Integer)
    fn_season: Mapped[Optional[int]] = mapped_column(Integer); fn_episode: Mapped[Optional[str]] = mapped_column(String)
    fn_item_type: Mapped[Optional[str]] = mapped_column(String); fn_part: Mapped[Optional[int]] = mapped_column(Integer)
    fd_title: Mapped[Optional[str]] = mapped_column(String); fd_year: Mapped[Optional[int]] = mapped_column(Integer)
    fd_season: Mapped[Optional[int]] = mapped_column(Integer); fd_episode: Mapped[Optional[str]] = mapped_column(String)
    fd_item_type: Mapped[Optional[str]] = mapped_column(String); fd_part: Mapped[Optional[int]] = mapped_column(Integer)
    it_title: Mapped[Optional[str]] = mapped_column(String); it_year: Mapped[Optional[int]] = mapped_column(Integer)
    it_season: Mapped[Optional[int]] = mapped_column(Integer); it_episode: Mapped[Optional[str]] = mapped_column(String)
    it_item_type: Mapped[Optional[str]] = mapped_column(String)
    target_language: Mapped[Optional[str]] = mapped_column(String); source: Mapped[MediaSource] = mapped_column(SQLEnum(MediaSource), default=MediaSource.NONE)
    edition: Mapped[MovieEdition] = mapped_column(SQLEnum(MovieEdition), default=MovieEdition.NONE)
    audio_type: Mapped[MediaAudioType] = mapped_column(SQLEnum(MediaAudioType), default=MediaAudioType.NONE)
    part: Mapped[Optional[int]] = mapped_column(Integer)
    part_type: Mapped[PartType] = mapped_column(SQLEnum(PartType), default=PartType.PART)
    part_style: Mapped[PartStyle] = mapped_column(SQLEnum(PartStyle), default=PartStyle.NONE)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False); status: Mapped[ItemStatus] = mapped_column(SQLEnum(ItemStatus), default=ItemStatus.NEW, index=True)
    planned_path: Mapped[Optional[str]] = mapped_column(String) # The path proposed by the Formatter
    category: Mapped[str] = mapped_column(String, default="video", index=True); created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    matches: Mapped[List["MediaMatch"]] = relationship(back_populates="media_item", cascade="all, delete-orphan")
    extras: Mapped[List["ExtraFile"]] = relationship(back_populates="parent_item", cascade="all, delete-orphan")
    action_logs: Mapped[List["ActionLog"]] = relationship(back_populates="media_item")
    def __repr__(self) -> str: return f"<MediaItem(id={self.id}, status={self.status.value}, path={self.current_path})>"


class ExtraFile(Base):
    """Associated files like subtitles, images, and trailers."""
    __tablename__ = "extra_files"
    id: Mapped[int] = mapped_column(primary_key=True); parent_item_id: Mapped[int] = mapped_column(ForeignKey("media_items.id"), index=True)
    category: Mapped[ExtraCategory] = mapped_column(SQLEnum(ExtraCategory), nullable=False)
    subtype: Mapped[Optional[ExtraSubtype]] = mapped_column(SQLEnum(ExtraSubtype), nullable=True)
    original_path: Mapped[str] = mapped_column(String, nullable=False, index=True); current_path: Mapped[str] = mapped_column(String, nullable=False, index=True)
    extension: Mapped[str] = mapped_column(String)
    language: Mapped[Optional[str]] = mapped_column(String)
    parent_item: Mapped["MediaItem"] = relationship(back_populates="extras")
    action_logs: Mapped[List["ActionLog"]] = relationship(back_populates="extra_file")
