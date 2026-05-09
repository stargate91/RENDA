import sys
if sys.platform == "win32":
    import io; sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.formatter.formatter import Formatter, FormatterConfig, Casing, Separator, to_roman, to_alpha

print("=== FORMATTER TESZT ===\n")

# 1. Alapértelmezett (default casing, space separator)
f = Formatter(FormatterConfig(
    movie_file="{title} ({year}){ext}",
    movie_folder="{title} ({year})"
))
ctx = {"title": "The Matrix", "year": "1999", "ext": ".mkv", "director": "Lana Wachowski"}
print(f"Default:  File={f.format_movie_filename(ctx)}  |  Folder={f.format_movie_foldername(ctx)}")

# 2. Dot separator + lower
f2 = Formatter(FormatterConfig(casing=Casing.LOWER, separator=Separator.DOT,
    movie_file="{title}.{year}.{resolution}.{source}{ext}",
    movie_folder="{title}.({year})"
))
ctx2 = {**ctx, "resolution": "1080p", "source": "BluRay", "ext": ".mkv"}
print(f"Dot+Low:  File={f2.format_movie_filename(ctx2)}  |  Folder={f2.format_movie_foldername(ctx2)}")

# 3. Hiányzó year → üres zárójelek eltűnnek
ctx3 = {"title": "Unknown Movie", "year": "", "ext": ".mp4"}
print(f"No year:  File={f.format_movie_filename(ctx3)}")

# 4. Part teszt (Disc II)
print(f"\nPart konverziók:")
print(f"  to_roman(3) = {to_roman(3)}")
print(f"  to_roman(14) = {to_roman(14)}")
print(f"  to_alpha(1) = {to_alpha(1)}")
print(f"  to_alpha(3) = {to_alpha(3)}")

# 5. Illegális karakterek
ctx5 = {"title": 'The Matrix: Reloaded / "Special"', "year": "2003", "ext": ".mkv"}
print(f"\nIllegális: {f.format_movie_filename(ctx5)}")

# 6. Edition + Source a templateben
f6 = Formatter(FormatterConfig(
    movie_file="{title} ({year}) [{edition}] [{source}]{ext}"
))
ctx6 = {"title": "Blade Runner", "year": "1982", "edition": "Director's Cut", "source": "BluRay", "ext": ".mkv"}
print(f"Edition:  {f6.format_movie_filename(ctx6)}")

# 7. Collection
f7 = Formatter(FormatterConfig(collection_folder="{collection}"))
ctx7 = {"collection": "The Matrix Collection"}
print(f"Collection: {f7.format_collection_foldername(ctx7)}")

# 8. Title casing
f8 = Formatter(FormatterConfig(casing=Casing.TITLE, separator=Separator.UNDERSCORE,
    movie_file="{title}_{year}{ext}"
))
ctx8 = {"title": "the dark knight rises", "year": "2012", "ext": ".mkv"}
print(f"Title+_:  {f8.format_movie_filename(ctx8)}")
