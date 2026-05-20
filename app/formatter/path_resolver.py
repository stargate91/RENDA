from typing import List, Dict
from .models import RenamePreview


class PathResolver:
    """
    Handles detection and resolution of target path collisions and path length checks.
    """

    def check_path_lengths(self, preview: RenamePreview):
        """Rekurzívan ellenőrzi az útvonalhosszokat és figyelmeztetést ad."""
        if preview.is_too_long:
            preview.warnings.append(f"Path exceeds Windows limit ({len(preview.target_path)}/260 chars)")
        
        for ep in preview.extra_previews:
            self.check_path_lengths(ep)

    def resolve_collisions(self, previews: List[RenamePreview]) -> List[RenamePreview]:
        """
        Észleli az ütközéseket és automatikusan sorszámozza az extrákat.
        Módosítja a 'previews' listát helyben.
        """
        # 1. Kilapítjuk a listát, hogy az extrák is benne legyenek a közös kalapban
        all_to_check: List[RenamePreview] = []
        for p in previews:
            all_to_check.append(p)
            all_to_check.extend(p.extra_previews)

        # 2. Csoportosítás teljes célútvonal alapján
        path_map: Dict[str, List[RenamePreview]] = {}
        for p in all_to_check:
            full_path = p.target_path.lower()
            if full_path not in path_map:
                path_map[full_path] = []
            path_map[full_path].append(p)

        # 3. Ütközések feloldása
        for full_path, items in path_map.items():
            if len(items) > 1:
                # Van ütközés!
                
                # A. EXTRÁK: Automatikus sorszámozás
                if all(i.item_type == "extra" for i in items):
                    for idx, item in enumerate(items, 1):
                        # Beszúrjuk a sorszámot a kiterjesztés elé
                        name_parts = item.target_name.rsplit(".", 1)
                        if len(name_parts) == 2:
                            item.target_name = f"{name_parts[0]} {idx}.{name_parts[1]}"
                        else:
                            item.target_name = f"{item.target_name} {idx}"
                
                # B. FŐ MÉDIA: Csak flageljük
                else:
                    group_id = f"coll_{len(full_path)}" # Egyszerű ID az UI-nak
                    for item in items:
                        item.has_collision = True
                        item.collision_group_id = group_id
        
        return previews
