import os

with open('app/db/models_old.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_block(start, end):
    return "".join(lines[start-1:end])

def write_model(filename, imports, content):
    full = f"{imports}\n\n{content}"
    with open(f"app/db/models/{filename}", "w", encoding='utf-8') as f:
        f.write(full)

# 1. Enums (Lines 11-64)
enums_imports = "import enum"
enums_content = get_block(11, 64)
write_model("enums.py", enums_imports, enums_content)

# 2. Media (MediaItem: 67-107, ExtraFile: 214-224)
media_imports = """from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, Enum as SQLEnum, JSON, Boolean, BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from .enums import ItemType, ItemStatus, MovieEdition, MediaSource, MediaAudioType, PartType, PartStyle, ExtraCategory, ExtraSubtype"""
media_content = get_block(67, 107) + "\n\n" + get_block(214, 224)
write_model("media.py", media_imports, media_content)

# 3. Metadata (MediaMatch: 110-139, MetadataLocalization: 142-167, TMDBCache: 202-211)
metadata_imports = """from datetime import datetime
from typing import List, Optional, Any
from sqlalchemy import String, Integer, Float, DateTime, Enum as SQLEnum, JSON, Boolean, BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref
from app.db.base import Base
from .enums import ItemType, ImageStatus"""
metadata_content = get_block(110, 139) + "\n\n" + get_block(142, 167) + "\n\n" + get_block(202, 211)
write_model("metadata.py", metadata_imports, metadata_content)

# 4. Person (Person: 170-182, PersonLocalization: 185-190, MediaPersonLink: 193-199)
person_imports = """from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, Enum as SQLEnum, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from .enums import ImageStatus"""
person_content = get_block(170, 182) + "\n\n" + get_block(185, 190) + "\n\n" + get_block(193, 199)
write_model("person.py", person_imports, person_content)

# 5. Action (ActionBatch: 227-232, ActionLog: 235-248)
action_imports = """from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, DateTime, Enum as SQLEnum, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from .enums import ActionType, ActionStatus"""
action_content = get_block(227, 232) + "\n\n" + get_block(235, 248)
write_model("action.py", action_imports, action_content)

# 6. Settings (UserSetting: 251-257)
settings_imports = """from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base"""
settings_content = get_block(251, 257)
write_model("settings.py", settings_imports, settings_content)

# 7. __init__.py
init_content = """# Export all models and enums
from .enums import *
from .media import *
from .metadata import *
from .person import *
from .action import *
from .settings import *
"""
write_model("__init__.py", "", init_content)

print("Split complete")
