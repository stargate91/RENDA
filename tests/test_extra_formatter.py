from app.db.base import Session
from app.db.models import MediaItem, ExtraFile, ExtraCategory, ExtraSubtype
from app.formatter.formatter import Formatter, FormatterConfig

db = Session()
try:
    config = FormatterConfig() # Use defaults
    formatter = Formatter(config)
    
    # Mock parent
    parent_name = "The Hot Chick (2002) 1080p"
    
    # Mock extra
    extra = ExtraFile(
        category=ExtraCategory.VIDEO,
        subtype=ExtraSubtype.SAMPLE,
        original_path="sample.the.hot.chick.1080p-trinity.mkv",
        extension=".mkv"
    )
    
    ctx = formatter.build_extra_context(extra, parent_name)
    print(f"Context: {ctx}")
    
    name = formatter.format_extra_filename(ctx)
    print(f"Formatted Name: {name}")
    
    sub = formatter.get_extra_subpath(extra)
    print(f"Subpath: {sub}")

finally:
    db.close()
