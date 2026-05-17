from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime
from ..db.models import ItemStatus, ItemType

class MediaMatchDTO(BaseModel):
    id: int
    tmdb_id: Optional[int]
    type: str
    title: str
    year: Optional[int]
    poster_path: Optional[str] = None
    vote_average: Optional[float] = None
    is_active: bool
    confidence: float

    model_config = ConfigDict(from_attributes=True)

class MediaImageDTO(BaseModel):
    type: str
    path: str

class MediaItemDTO(BaseModel):
    id: int
    filename: str
    status: str
    type: str
    title: str
    year: Optional[int] = None
    planned_path: Optional[str] = None
    extension: str
    size_mb: float
    images: List[MediaImageDTO] = []
    matches: List[MediaMatchDTO] = []
    current_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ExtraFileDTO(BaseModel):
    id: int
    parent_id: int
    parent_name: str
    filename: str
    extension: str
    category: str
    subtype: str
    language: Optional[str] = None
    path: str
    planned_path: Optional[str] = None
    action: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DiscoveryGroupsDTO(BaseModel):
    manual: List[MediaItemDTO] = []
    movies: List[MediaItemDTO] = []
    series: List[MediaItemDTO] = []
    extras: List[ExtraFileDTO] = []
    collisions: List[MediaItemDTO] = []

class LibraryItemDTO(BaseModel):
    id: int
    title: str
    year: Optional[int]
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    rating: float
    type: str
    path: Optional[str] = None

class LibraryGroupedDTO(BaseModel):
    movies: List[LibraryItemDTO] = []
    series: List[LibraryItemDTO] = []
    adult: List[LibraryItemDTO] = []
    counts: Dict[str, int] = {"movies": 0, "series": 0, "adult": 0}

class LibraryStatsDTO(BaseModel):
    total_movies: int
    total_series: int
    total_episodes: int
    storage: str
    drive_count: int
    unmatched: int
