# RENDA Backend Architecture & Coding Rules

Ez a dokumentum rögzíti a backend átírásának és fejlesztésének alapköveit. Minden új kódnak és refaktornak követnie kell ezeket a szabályokat a stabilitás és a skálázhatóság érdekében.

## 1. Architektúra: Service-Oriented Design
A logika nem lakhat az API route-okban.
- **Routes (app/api/routes/)**: Csak a kérések fogadása, validálása (Pydantic) és a válasz küldése.
- **Services (app/services/)**: Itt lakik az üzleti logika (pl. `DiscoveryService`, `OrganizationService`). A route-ok csak ezeket hívhatják.
- **Managers (app/core/)**: Alacsony szintű erőforrás-kezelők (pl. `ScannerManager`, `ImageWorker`).

## 2. Útvonal-kezelés (Single Source of Truth)
A legfőbb hibaforrás jelenleg a szétszórt útvonal-generálás.
- **Formatter**: A `app/formatter/formatter.py` az EGYETLEN hely, ahol fájlnév vagy mappa útvonal generálódhat.
- **Tilos**: `os.path.join`, `f"{path}/{file}"` vagy manuális string műveletek bárhol máshol a kódban.
- **Kötelező**: Mindig a `Formatter.format_item` vagy `plan_rename` hívása, ha útvonalra van szükség.

## 3. Adatbázis és Konkurrencia
Mivel `.exe` a cél, maradunk az SQLite-nál, de profi módon:
- **Async**: Átállás `SQLAlchemy` async módbat és `aiosqlite` meghajtóra.
- **WAL Mode**: Az adatbázist mindig `PRAGMA journal_mode=WAL;` módban kell tartani a párhuzamos írás/olvasás miatt.
- **Integrity**: Több epizódos fájlokhoz kötelező a `MediaMatch.episode_number` JSON lista alapú kezelése, tilos több külön Match rekordot létrehozni ugyanahhoz a fájlhoz.

## 4. Háttérfolyamatok (Tasks)
- Minden hosszú folyamat (Scan, Metadata Enrich, Image Download) háttérben fut, nem blokkolhatja az API választ.
- A háttérfolyamatok állapotát egy központi `TaskTracker` vagy `StatusManager` figyelje, amit a frontend lekérdezhet.

## 5. UI Szerződés (API Contract)
A UI (React) kódját nem írjuk újra, ezért az API kimeneti formátumának meg kell maradnia.
- Ha változtatunk a belső logikán, a válasz JSON struktúrája (mezőnevek, típusok) maradjon kompatibilis a jelenlegivel.
- Használjunk explicit `action` mezőket (pl. `action: "rename" | "delete" | "ignore"`) a félreértések elkerülésére.

## 6. Hibakezelés és Naplózás
- Minden szerviz hívást `try-except` blokkba kell tenni.
- Hiba esetén a frontendnek értelmezhető hibaüzenetet kell küldeni (nem csak 500-at).
- Használjuk a központi `logger`-t minden fontos eseményhez.
