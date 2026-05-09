from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker, scoped_session

# Database file location
DATABASE_URL = "sqlite:///renda.db"

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models in the application."""
    pass

# Engine initialization
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} # Required for multi-threaded SQLite usage
)

# SQLite Optimization: Enable WAL (Write-Ahead Logging) mode
# This allows concurrent reads and writes, preventing "database is locked" errors during background operations.
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

# Thread-safe Session factory using scoped_session
# Ensures each thread gets its own unique session instance.
session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Session = scoped_session(session_factory)

def get_db():
    """
    Dependency helper for session management.
    Provides a thread-safe database session and ensures proper cleanup.
    """
    db = Session()
    try:
        yield db
    finally:
        # Crucial for scoped_session to clean up the thread-local reference
        Session.remove()
