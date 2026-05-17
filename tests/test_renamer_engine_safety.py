import shutil
import uuid
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import (
    Base,
    ExtraCategory,
    ExtraFile,
    ItemStatus,
    ItemType,
    MediaItem,
)
from app.formatter.formatter import RenamePreview
from app.renamer.renamer_engine import RenamerEngine


class RenamerEngineSafetyTest(unittest.TestCase):
    def setUp(self):
        scratch_root = Path("scratch")
        scratch_root.mkdir(exist_ok=True)
        self.root = scratch_root / f"renamer_engine_safety_{uuid.uuid4().hex}"
        self.src = self.root / "source"
        self.dst = self.root / "library"
        self.src.mkdir(parents=True)
        self.dst.mkdir(parents=True)

        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.session = sessionmaker(bind=engine)()
        self.renamer = RenamerEngine(self.session)

    def tearDown(self):
        self.session.close()
        shutil.rmtree(self.root, ignore_errors=True)

    def _media_with_extra(self):
        movie_path = self.src / "movie.mkv"
        extra_path = self.src / "movie.srt"
        movie_path.touch()
        extra_path.touch()

        item = MediaItem(
            original_path=str(movie_path),
            current_path=str(movie_path),
            filename="movie.mkv",
            extension=".mkv",
            status=ItemStatus.MATCHED,
            item_type=ItemType.MOVIE,
        )
        self.session.add(item)
        self.session.commit()

        extra = ExtraFile(
            parent_item_id=item.id,
            category=ExtraCategory.SUBTITLE,
            original_path=str(extra_path),
            current_path=str(extra_path),
            extension=".srt",
        )
        self.session.add(extra)
        self.session.commit()
        return item, extra, movie_path, extra_path

    def test_delete_extra_action_removes_file_and_db_row(self):
        item, extra, movie_path, extra_path = self._media_with_extra()
        preview = RenamePreview(
            item_id=item.id,
            original_path=str(movie_path),
            target_name="Movie.mkv",
            target_subpath="Movie",
            item_type="movie",
            destination_root=str(self.dst),
        )
        preview.extra_previews.append(RenamePreview(
            item_id=extra.id,
            original_path=str(extra_path),
            target_name="",
            target_subpath="",
            item_type="extra",
            destination_root="",
            action="delete",
            extra_id=extra.id,
        ))

        self.assertTrue(self.renamer.execute_single(preview))

        self.assertTrue((self.dst / "Movie" / "Movie.mkv").exists())
        self.assertFalse(extra_path.exists())
        self.assertIsNone(self.session.get(ExtraFile, extra.id))

    def test_extra_target_collision_rolls_back_main_move(self):
        item, extra, movie_path, extra_path = self._media_with_extra()
        target_dir = self.dst / "Movie"
        target_dir.mkdir()
        existing_extra = target_dir / "Movie.srt"
        existing_extra.write_text("keep me", encoding="utf-8")

        preview = RenamePreview(
            item_id=item.id,
            original_path=str(movie_path),
            target_name="Movie.mkv",
            target_subpath="Movie",
            item_type="movie",
            destination_root=str(self.dst),
        )
        preview.extra_previews.append(RenamePreview(
            item_id=extra.id,
            original_path=str(extra_path),
            target_name="Movie.srt",
            target_subpath="Movie",
            item_type="extra",
            destination_root=str(self.dst),
            extra_id=extra.id,
        ))

        self.assertFalse(self.renamer.execute_single(preview))

        self.assertTrue(movie_path.exists())
        self.assertTrue(extra_path.exists())
        self.assertEqual(existing_extra.read_text(encoding="utf-8"), "keep me")
        self.session.refresh(item)
        self.assertEqual(item.current_path, str(movie_path))


if __name__ == "__main__":
    unittest.main()
