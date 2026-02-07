"""Database session utilities."""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

# Pool settings for concurrent RQ workers (multiple users, multiple workspaces)
# Each worker process has its own engine; pool_pre_ping handles stale connections
_engine_kwargs: dict = {
    "connect_args": connect_args,
    "future": True,
    "pool_pre_ping": True,  # Reconnect on stale connections (important for long-running workers)
}
if settings.database_url.startswith("postgresql"):
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


def get_session() -> Generator[Session, None, None]:
    """Yield a database session for FastAPI dependencies."""
    session: Session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


