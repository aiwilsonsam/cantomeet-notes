"""User model definition."""

from __future__ import annotations

import uuid

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models import TimestampMixin


class User(TimestampMixin, Base):
    """Represents an account that owns meetings."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    locale: Mapped[str] = mapped_column(String(16), default="zh-HK", server_default="zh-HK")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Hong_Kong", server_default="Asia/Hong_Kong")
    last_login_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    meetings: Mapped[list["Meeting"]] = relationship("Meeting", back_populates="owner")
    workspace_memberships: Mapped[list["WorkspaceMember"]] = relationship(
        "WorkspaceMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:  # pragma: no cover - repr is for debugging only.
        return f"<User id={self.id} email={self.email}>"


