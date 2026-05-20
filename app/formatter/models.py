from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List


@dataclass
class RenamePreview:
    """Átnevezési előnézet egy fájlhoz."""
    item_id: int
    original_path: str
    target_name: str      # Csak a fájlnév
    target_subpath: str   # Kategória/Sorozat/Szezon mappa struktúra
    item_type: str        # 'movie', 'series', 'episode', 'extra'
    destination_root: str = ""
    action: str = "rename" # 'rename', 'delete', 'ignore'
    extra_id: Optional[int] = None # Csak extráknál
    has_collision: bool = False
    collision_group_id: Optional[str] = None # Azonos ID az ütköző fájloknak
    extra_previews: List['RenamePreview'] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    @property
    def target_path(self) -> str:
        """Teljes célútvonal."""
        return str(Path(self.destination_root) / self.target_subpath / self.target_name)

    @property
    def is_too_long(self) -> bool:
        """Windows MAX_PATH (260) check."""
        return len(self.target_path) >= 260
