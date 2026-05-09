from datetime import datetime
from typing import List, Optional, Any
from sqlalchemy import ForeignKey, String, Integer, Float, DateTime, Enum as SQLEnum, JSON, UniqueConstraint, Boolean, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref
import enum

from .base import Base

# --- Enums ---

class ItemType(enum.Enum):
    MOVIE = "movie"; SERIES = "series"; SEASON = "season"; EPISODE = "episode"; PERSON = "person"

class ItemStatus(enum.Enum):
    NEW = "new"; NO_MATCH = "no_match"; UNCERTAIN = "uncertain"; MULTIPLE = "multiple"
    MATCHED = "matched"; ORGANIZED = "organized"; RENAMED = "renamed"; ERROR = "error"

class ImageStatus(enum.Enum):
    PENDING = "pending"; DOWNLOADING = "downloading"; COMPLETED = "completed"; FAILED = "failed"

class MovieEdition(enum.Enum):
    NONE = "none"; THEATRICAL = "theatrical"; DIRECTORS_CUT = "directors_cut"
    EXTENDED = "extended"; UNRATED = "unrated"; REMASTERED = "remastered"
    SPECIAL = "special"; ULTIMATE = "ultimate"; COLLECTORS = "collectors"; FAN_EDIT = "fan_edit"

class MediaSource(enum.Enum):
    NONE = "none"; BLURAY = "bluray"; WEB = "web"; DVD = "dvd"; TV = "tv"; CAM = "cam"

class MediaAudioType(enum.Enum):
    NONE = "none"; MONO = "mono"; STEREO = "stereo"; SURROUND = "surround"
    DUAL_AUDIO = "dual_audio"; MULTI_AUDIO = "multi_audio"

class PartType(enum.Enum):
    """A 'part' előtti szöveg típusa."""
    NONE = "none"; CD = "CD"; PART = "Part"; DISC = "Disc"; VOLUME = "Volume"

class PartStyle(enum.Enum):
    """A résszám formázási stílusa."""
    ARABIC = "arabic"    # 1, 2, 3
    ALPHA = "alpha"      # A, B, C
    ROMAN = "roman"      # I, II, III

class ActionType(enum.Enum):
    RENAME = "rename"; MOVE = "move"; COPY = "copy"; DELETE = "delete"
    METADATA_UPDATE = "metadata_update"; IDENTIFY = "identify"

class ActionStatus(enum.Enum):
    SUCCESS = "success"; FAILED = "failed"; PENDING = "pending"; UNDONE = "undone"

class ExtraCategory(enum.Enum):
    VIDEO = "video"; IMAGE = "image"; METADATA = "metadata"; SUBTITLE = "subtitle"; AUDIO = "audio"; OTHER = "other"

class ExtraSubtype(enum.Enum):
    TRAILER = "trailer"; SAMPLE = "sample"; BEHIND_THE_SCENES = "behind_the_scenes"
    FEATURETTE = "featurette"; DELETED_SCENES = "deleted_scenes"; INTERVIEW = "interview"
    SCENE_COMPARISON = "scene_comparison"; SHORT = "short"; PROMO = "promo"; CLIP = "clip"
    POSTER = "poster"; FANART = "fanart"; DISC = "disc"; BACKDROP = "backdrop"
    BANNER = "banner"; THUMBNAIL = "thumbnail"; LOGO = "logo"; CLEARLOGO = "clearlogo"
    CHARACTER_ART = "character_art"; FULL = "full"; FORCED = "forced"; SDH = "sdh"
    HEARING_IMPAIRED = "hearing_impaired"; COMMENTARY_SUB = "commentary_sub"; LYRICS = "lyrics"
    DUBBED = "dubbed"; ORIGINAL = "original"; COMMENTARY_AUDIO = "commentary_audio"
    DESCRIPTIVE = "descriptive"; ISOLATED_SCORE = "isolated_score"
    NFO = "nfo"; XML = "xml"; JSON = "json"; TXT = "txt"; URL = "url"; OTHER = "other"

# --- Models ---

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
    part_style: Mapped[PartStyle] = mapped_column(SQLEnum(PartStyle), default=PartStyle.ARABIC)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False); status: Mapped[ItemStatus] = mapped_column(SQLEnum(ItemStatus), default=ItemStatus.NEW, index=True)
    category: Mapped[str] = mapped_column(String, default="video", index=True); created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    matches: Mapped[List["MediaMatch"]] = relationship(back_populates="media_item", cascade="all, delete-orphan")
    extras: Mapped[List["ExtraFile"]] = relationship(back_populates="parent_item", cascade="all, delete-orphan")
    action_logs: Mapped[List["ActionLog"]] = relationship(back_populates="media_item")
    def __repr__(self) -> str: return f"<MediaItem(id={self.id}, status={self.status.value}, path={self.current_path})>"


class MediaMatch(Base):
    """Level 2: Global metadata match (e.g., TMDB result)."""
    __tablename__ = "media_matches"
    id: Mapped[int] = mapped_column(primary_key=True); media_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_items.id"), index=True)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_matches.id"), index=True); tmdb_id: Mapped[int] = mapped_column(Integer, index=True)
    imdb_id: Mapped[Optional[str]] = mapped_column(String, index=True); series_tmdb_id: Mapped[Optional[int]] = mapped_column(Integer)
    season_tmdb_id: Mapped[Optional[int]] = mapped_column(Integer); item_type: Mapped[ItemType] = mapped_column(SQLEnum(ItemType))
    season_number: Mapped[Optional[int]] = mapped_column(Integer); episode_number: Mapped[Optional[int]] = mapped_column(Integer)
    episode_count: Mapped[Optional[int]] = mapped_column(Integer); rating_tmdb: Mapped[Optional[float]] = mapped_column(Float)
    rating_imdb: Mapped[Optional[float]] = mapped_column(Float); rating_rotten: Mapped[Optional[str]] = mapped_column(String)
    rating_meta: Mapped[Optional[int]] = mapped_column(Integer); vote_count_tmdb: Mapped[Optional[int]] = mapped_column(Integer)
    vote_count_imdb: Mapped[Optional[int]] = mapped_column(Integer); budget: Mapped[Optional[int]] = mapped_column(BigInteger)
    revenue: Mapped[Optional[int]] = mapped_column(BigInteger); runtime: Mapped[Optional[int]] = mapped_column(Integer)
    popularity: Mapped[Optional[float]] = mapped_column(Float); release_status: Mapped[Optional[str]] = mapped_column(String)
    series_type: Mapped[Optional[str]] = mapped_column(String)  # Scripted, Documentary, Miniseries, Reality
    cast: Mapped[Optional[List[dict]]] = mapped_column(JSON); director: Mapped[Optional[str]] = mapped_column(String)
    networks: Mapped[Optional[List[str]]] = mapped_column(JSON); collection: Mapped[Optional[str]] = mapped_column(String)
    release_date: Mapped[Optional[datetime]] = mapped_column(DateTime); first_air_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_air_date: Mapped[Optional[datetime]] = mapped_column(DateTime); episode_air_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    season_air_date: Mapped[Optional[datetime]] = mapped_column(DateTime); number_of_seasons: Mapped[Optional[int]] = mapped_column(Integer)
    number_of_episodes: Mapped[Optional[int]] = mapped_column(Integer); fetched_languages: Mapped[Optional[str]] = mapped_column(String)
    image_status: Mapped[ImageStatus] = mapped_column(SQLEnum(ImageStatus), default=ImageStatus.PENDING, index=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    localizations: Mapped[List["MetadataLocalization"]] = relationship(back_populates="match", cascade="all, delete-orphan")
    media_item: Mapped[Optional["MediaItem"]] = relationship(back_populates="matches")
    children: Mapped[List["MediaMatch"]] = relationship("MediaMatch", backref=backref("parent", remote_side=[id]))
    people: Mapped[List["MediaPersonLink"]] = relationship(back_populates="media_match", cascade="all, delete-orphan")


class MetadataLocalization(Base):
    """Level 3: Language-specific metadata (localized titles, overviews)."""
    __tablename__ = "metadata_localizations"
    id: Mapped[int] = mapped_column(primary_key=True); match_id: Mapped[int] = mapped_column(ForeignKey("media_matches.id"))
    target_language: Mapped[str] = mapped_column(String, default="en", index=True); is_primary: Mapped[bool] = mapped_column(Boolean, default=True)
    title: Mapped[str] = mapped_column(String); original_title: Mapped[Optional[str]] = mapped_column(String)
    series_title: Mapped[Optional[str]] = mapped_column(String); original_series_title: Mapped[Optional[str]] = mapped_column(String)
    season_title: Mapped[Optional[str]] = mapped_column(String)
    episode_title: Mapped[Optional[str]] = mapped_column(String); tagline: Mapped[Optional[str]] = mapped_column(String)
    overview: Mapped[Optional[str]] = mapped_column(String); genres: Mapped[Optional[List[str]]] = mapped_column(JSON)
    origin_country: Mapped[Optional[List[str]]] = mapped_column(JSON)
    original_language: Mapped[Optional[str]] = mapped_column(String)
    spoken_languages: Mapped[Optional[List[str]]] = mapped_column(JSON)
    poster_path: Mapped[Optional[str]] = mapped_column(String)
    local_poster_path: Mapped[Optional[str]] = mapped_column(String)
    series_poster_path: Mapped[Optional[str]] = mapped_column(String)
    local_series_poster_path: Mapped[Optional[str]] = mapped_column(String)
    backdrop_path: Mapped[Optional[str]] = mapped_column(String)
    local_backdrop_path: Mapped[Optional[str]] = mapped_column(String)
    still_path: Mapped[Optional[str]] = mapped_column(String)
    local_still_path: Mapped[Optional[str]] = mapped_column(String)
    local_thumb_path: Mapped[Optional[str]] = mapped_column(String) # For fast UI previews
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    match: Mapped["MediaMatch"] = relationship(back_populates="localizations")


class Person(Base):
    """Cast and crew - Global information."""
    __tablename__ = "persons"
    id: Mapped[int] = mapped_column(primary_key=True); birthday: Mapped[Optional[str]] = mapped_column(String)
    deathday: Mapped[Optional[str]] = mapped_column(String); place_of_birth: Mapped[Optional[str]] = mapped_column(String)
    gender: Mapped[Optional[int]] = mapped_column(Integer); popularity: Mapped[Optional[float]] = mapped_column(Float)
    known_for_department: Mapped[Optional[str]] = mapped_column(String); profile_path: Mapped[Optional[str]] = mapped_column(String)
    local_profile_path: Mapped[Optional[str]] = mapped_column(String)
    images: Mapped[Optional[List[str]]] = mapped_column(JSON); external_ids: Mapped[Optional[dict]] = mapped_column(JSON)
    fetched_languages: Mapped[Optional[str]] = mapped_column(String); image_status: Mapped[ImageStatus] = mapped_column(SQLEnum(ImageStatus), default=ImageStatus.PENDING, index=True)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    localizations: Mapped[List["PersonLocalization"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    media_links: Mapped[List["MediaPersonLink"]] = relationship(back_populates="person")


class PersonLocalization(Base):
    """Cast and crew - Language-specific information."""
    __tablename__ = "person_localizations"
    id: Mapped[int] = mapped_column(primary_key=True); person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"))
    language: Mapped[str] = mapped_column(String, default="en", index=True); name: Mapped[str] = mapped_column(String, nullable=False)
    biography: Mapped[Optional[str]] = mapped_column(String); person: Mapped["Person"] = relationship(back_populates="localizations")


class MediaPersonLink(Base):
    """Link table between media matches and people (cast/crew)."""
    __tablename__ = "media_person_links"
    id: Mapped[int] = mapped_column(primary_key=True); media_match_id: Mapped[int] = mapped_column(ForeignKey("media_matches.id"), index=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True); job: Mapped[str] = mapped_column(String, index=True)
    character_name: Mapped[Optional[str]] = mapped_column(String); order: Mapped[int] = mapped_column(Integer, default=0)
    media_match: Mapped["MediaMatch"] = relationship(back_populates="people"); person: Mapped["Person"] = relationship(back_populates="media_links")


class TMDBCache(Base):
    """Persistent storage for raw TMDB API responses."""
    __tablename__ = "tmdb_cache"
    id: Mapped[int] = mapped_column(primary_key=True)
    cache_key: Mapped[str] = mapped_column(String, unique=True, index=True) # Unique key for query/params
    tmdb_id: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    item_type: Mapped[Optional[ItemType]] = mapped_column(SQLEnum(ItemType))
    target_language: Mapped[str] = mapped_column(String, index=True)
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExtraFile(Base):
    """Associated files like subtitles, images, and trailers."""
    __tablename__ = "extra_files"
    id: Mapped[int] = mapped_column(primary_key=True); parent_item_id: Mapped[int] = mapped_column(ForeignKey("media_items.id"), index=True)
    category: Mapped[ExtraCategory] = mapped_column(SQLEnum(ExtraCategory), nullable=False)
    subtype: Mapped[ExtraSubtype] = mapped_column(SQLEnum(ExtraSubtype), default=ExtraSubtype.OTHER)
    original_path: Mapped[str] = mapped_column(String, nullable=False, index=True); current_path: Mapped[str] = mapped_column(String, nullable=False, index=True)
    extension: Mapped[str] = mapped_column(String)
    language: Mapped[Optional[str]] = mapped_column(String)
    parent_item: Mapped["MediaItem"] = relationship(back_populates="extras")
    action_logs: Mapped[List["ActionLog"]] = relationship(back_populates="extra_file")


class ActionBatch(Base):
    """Represents a group of operations performed together (for Undo)."""
    __tablename__ = "action_batches"
    id: Mapped[int] = mapped_column(primary_key=True); name: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    logs: Mapped[List["ActionLog"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class ActionLog(Base):
    """Audit log for individual file operations."""
    __tablename__ = "action_logs"
    id: Mapped[int] = mapped_column(primary_key=True); batch_id: Mapped[int] = mapped_column(ForeignKey("action_batches.id"), index=True)
    media_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_items.id"), index=True)
    extra_file_id: Mapped[Optional[int]] = mapped_column(ForeignKey("extra_files.id"), index=True)
    action_type: Mapped[ActionType] = mapped_column(SQLEnum(ActionType))
    status: Mapped[ActionStatus] = mapped_column(SQLEnum(ActionStatus), default=ActionStatus.PENDING)
    old_value: Mapped[Optional[str]] = mapped_column(String); new_value: Mapped[Optional[str]] = mapped_column(String)
    error_message: Mapped[Optional[str]] = mapped_column(String)
    details: Mapped[Optional[dict]] = mapped_column(JSON); created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    batch: Mapped["ActionBatch"] = relationship(back_populates="logs")
    media_item: Mapped[Optional["MediaItem"]] = relationship(back_populates="action_logs")
    extra_file: Mapped[Optional["ExtraFile"]] = relationship(back_populates="action_logs")


class UserSetting(Base):
    """Application-wide user configurations."""
    __tablename__ = "user_settings"
    key: Mapped[str] = mapped_column(String, primary_key=True); value: Mapped[Any] = mapped_column(JSON)
    description: Mapped[Optional[str]] = mapped_column(String); updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    def __repr__(self) -> str: return f"<UserSetting(key={self.key}, value={self.value})>"
