"""Declarative base and global model imports for Alembic."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class shared across all SQLAlchemy models."""


# Import models here so Alembic's autogenerate can discover them.
from app.models import (  # noqa: E402,F401
    action_item,
    meeting,
    processing_task,
    summary,
    transcript,
    user,
    workspace,
)



