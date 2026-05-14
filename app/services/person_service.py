import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from ..db.models import Person, PersonLocalization, MediaPersonLink, MediaMatch, ImageStatus
from ..repositories.person_repository import PersonRepository

logger = logging.getLogger(__name__)

class PersonService:
    """
    Service for managing people (cast, crew) and their associated assets (profile images).
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = PersonRepository(db)

    def get_or_create_person(self, person_data: Dict[str, Any]) -> Person:
        """
        Retrieves an existing person or creates a new one based on TMDB/remote data.
        Ensures thread-safe creation.
        """
        tmdb_id = person_data["id"]
        person = self.repository.get_by_id(tmdb_id)
        if person:
            return person

        try:
            # Use nested transaction to handle potential race conditions during parallel enrichment
            with self.db.begin_nested():
                person = Person(
                    id=tmdb_id,
                    popularity=person_data.get("popularity"),
                    profile_path=person_data.get("profile_path"),
                    image_status=ImageStatus.PENDING if person_data.get("profile_path") else ImageStatus.NONE
                )
                self.db.add(person)
                
                # Default localization (English)
                loc = PersonLocalization(
                    person_id=tmdb_id,
                    language="en",
                    name=person_data.get("name", "Unknown")
                )
                self.db.add(loc)
                self.db.flush()
            return person
        except Exception as e:
            # If creation failed (likely already exists), fetch the existing one
            return self.repository.get_by_id(tmdb_id)

    def link_person_to_match(self, match: MediaMatch, person: Person, job: str, character: str = None, order: int = 0):
        """
        Links a person to a media match (movie/series) with a specific job/role.
        """
        link = self.db.query(MediaPersonLink).filter(
            MediaPersonLink.media_match_id == match.id,
            MediaPersonLink.person_id == person.id,
            MediaPersonLink.job == job
        ).first()
        
        if not link:
            try:
                with self.db.begin_nested():
                    link = MediaPersonLink(
                        media_match_id=match.id,
                        person_id=person.id,
                        job=job,
                        character_name=character,
                        order=order
                    )
                    self.db.add(link)
                    self.db.flush()
            except:
                pass # Already linked

    def get_person_details(self, person_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves formatted details for a person."""
        person = self.repository.get_by_id(person_id)
        if not person: return None
        
        loc = person.localizations[0] if person.localizations else None
        return {
            "id": person.id,
            "name": loc.name if loc else "Unknown",
            "profile_path": person.profile_path,
            "popularity": person.popularity
        }
