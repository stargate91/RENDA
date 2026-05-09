import unittest
import shutil
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Base, MediaItem, MediaMatch, ItemType, ItemStatus, ActionBatch, ActionLog, ActionType, ActionStatus, ExtraFile, ExtraCategory, ExtraSubtype
from app.renamer.renamer_engine import RenamerEngine, RenamePreview

class UndoHellTest(unittest.TestCase):
    def setUp(self):
        # In-memory helyett fájl alapú SQLite a teszthez, hogy lássuk a fizikai változást
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
        self.base_dir = Path("undo_hell_test")
        self.src_dir = self.base_dir / "source"
        self.dst_dir = self.base_dir / "library"
        
        if self.base_dir.exists():
            shutil.rmtree(self.base_dir)
        
        self.src_dir.mkdir(parents=True)
        self.dst_dir.mkdir(parents=True)
        
        self.renamer = RenamerEngine(self.session)

    def tearDown(self):
        self.session.close()
        if self.base_dir.exists():
            shutil.rmtree(self.base_dir)

    def test_undo_scenarios(self):
        print("\n--- UNDO HELL START ---")
        
        # 1. FÁJLOK ELŐKÉSZÍTÉSE
        # A. Normál film + extra
        f1_path = self.src_dir / "Movie1" / "movie.mkv"
        f1_path.parent.mkdir(parents=True)
        f1_path.touch()
        s1_path = f1_path.parent / "movie.srt"
        s1_path.touch()
        
        # B. Case-change teszt
        f2_path = self.src_dir / "casechange.mkv"
        f2_path.touch()
        
        # C. Manuális törlés teszt
        f3_path = self.src_dir / "delete_me.mkv"
        f3_path.touch()

        # 2. ADATBÁZIS FELTÖLTÉSE
        i1 = MediaItem(original_path=str(f1_path), current_path=str(f1_path), filename="movie.mkv", extension=".mkv", status=ItemStatus.MATCHED, item_type=ItemType.MOVIE)
        i2 = MediaItem(original_path=str(f2_path), current_path=str(f2_path), filename="casechange.mkv", extension=".mkv", status=ItemStatus.MATCHED, item_type=ItemType.MOVIE)
        i3 = MediaItem(original_path=str(f3_path), current_path=str(f3_path), filename="delete_me.mkv", extension=".mkv", status=ItemStatus.MATCHED, item_type=ItemType.MOVIE)
        self.session.add_all([i1, i2, i3])
        self.session.commit()
        
        ex1 = ExtraFile(parent_item_id=i1.id, category=ExtraCategory.SUBTITLE, 
                        original_path=str(s1_path), current_path=str(s1_path), extension=".srt")
        self.session.add(ex1)
        self.session.commit()

        # 3. ÁTNEVEZÉSI TERV (Preview-k)
        p1 = RenamePreview(item_id=i1.id, original_path=str(f1_path), 
                           target_name="The Movie (2024).mkv", target_subpath="The Movie (2024)",
                           item_type="movie", destination_root=str(self.dst_dir))
        p1.extra_previews.append(RenamePreview(item_id=ex1.id, original_path=str(s1_path),
                                              target_name="The Movie (2024).srt", target_subpath="The Movie (2024)",
                                              item_type="extra", destination_root=str(self.dst_dir), extra_id=ex1.id))
        
        p2 = RenamePreview(item_id=i2.id, original_path=str(f2_path), 
                           target_name="CASECHANGE.mkv", target_subpath="",
                           item_type="movie", destination_root=str(self.dst_dir))
        
        p3 = RenamePreview(item_id=i3.id, original_path=str(f3_path), 
                           target_name="WillBeDeleted.mkv", target_subpath="",
                           item_type="movie", destination_root=str(self.dst_dir))

        # 4. VÉGREHAJTÁS
        print("Műveletek végrehajtása...")
        self.renamer.execute_batch([p1, p2, p3], batch_name="Undo Test Batch")
        
        # Lekérjük a tényleges batch_id-t (amit a RenamerEngine hozott létre)
        actual_batch = self.session.query(ActionBatch).order_by(ActionBatch.id.desc()).first()
        batch_id = actual_batch.id
        print(f"Létrehozott Batch ID: {batch_id}")
        
        # Ellenőrizzük, hogy elmentek-e
        self.assertTrue((self.dst_dir / "The Movie (2024)" / "The Movie (2024).mkv").exists())
        self.assertTrue((self.dst_dir / "CASECHANGE.mkv").exists())
        self.assertFalse(f1_path.exists())
        
        # 5. MANUÁLIS BEAVATKOZÁS (A pokol kezdődik)
        print("Piszkoskodás: egy fájl törlése a célhelyről...")
        (self.dst_dir / "WillBeDeleted.mkv").unlink()
        
        # 6. UNDO
        print("\n--- UNDO INDÍTÁSA ---")
        undo_count = self.renamer.undo_batch(batch_id)
        print(f"Sikeres visszavonások: {undo_count}")
        
        # 7. ELLENŐRZÉS
        print("\n--- ELLENŐRZÉS ---")
        # Movie1 visszaállt?
        self.assertTrue(f1_path.exists(), "F1 nem állt vissza az eredeti helyére!")
        self.assertTrue(s1_path.exists(), "Extra (felirat) nem állt vissza!")
        
        # CaseChange visszaállt?
        self.assertTrue(f2_path.exists(), "F2 (case change) nem állt vissza!")
        self.assertEqual(f2_path.name, "casechange.mkv")
        
        # DeleteMe hiba lett?
        log3 = self.session.query(ActionLog).filter(ActionLog.new_value.contains("WillBeDeleted")).first()
        self.assertEqual(log3.status, ActionStatus.FAILED)
        self.assertEqual(log3.error_message, "File missing at destination")
        
        # Mappa takarítás ellenőrzése
        self.assertFalse((self.dst_dir / "The Movie (2024)").exists(), "Üres mappa maradt a Library-ben!")
        
        print("Teszt SIKERES! A rendszer túlélte a visszavonási poklot.")

if __name__ == "__main__":
    unittest.main()
