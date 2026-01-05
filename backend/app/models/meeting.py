"""Meeting model capturing upload + processing state."""

from __future__ import annotations

import uuid
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models import TimestampMixin


class MeetingStatus(str, Enum):
    """Processing lifecycle for a meeting upload."""

    UPLOADED = "uploaded"
    TRANSCRIBING = "transcribing"
    SUMMARIZING = "summarizing"
    COMPLETED = "completed"
    FAILED = "failed"
    SCHEDULED = "scheduled"


class Meeting(TimestampMixin, Base):
    """Meeting entity referencing audio uploads and downstream artifacts."""

    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[MeetingStatus] = mapped_column(
        SqlEnum(MeetingStatus),
        default=MeetingStatus.UPLOADED,
        server_default=MeetingStatus.UPLOADED.value,
        nullable=False,
    )
    status_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    language_code: Mapped[str] = mapped_column(String(16), default="yue", server_default="yue")
    recorded_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    audio_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    audio_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)  # Array of tag strings
    template: Mapped[str | None] = mapped_column(String(128), nullable=True)  # Template name
    hubspot_synced: Mapped[bool] = mapped_column(default=False, server_default="0", nullable=False)

    workspace_id: Mapped[str | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="meetings")
    owner: Mapped[Optional["User"]] = relationship("User", back_populates="meetings")
    transcript: Mapped[Optional["Transcript"]] = relationship(
        "Transcript",
        back_populates="meeting",
        uselist=False,
        cascade="all, delete-orphan",
    )
    summary: Mapped[Optional["Summary"]] = relationship(
        "Summary",
        back_populates="meeting",
        uselist=False,
        cascade="all, delete-orphan",
    )
    action_items: Mapped[list["ActionItem"]] = relationship(
        "ActionItem",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Meeting id={self.id} title={self.title} status={self.status}>"


