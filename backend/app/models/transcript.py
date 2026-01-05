"""Transcribed content for a meeting."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models import TimestampMixin


class Transcript(TimestampMixin, Base):
    """Normalized transcription output from Speechmatics."""

    __tablename__ = "transcripts"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    meeting_id: Mapped[str] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    language_code: Mapped[str] = mapped_column(String(16), default="yue", server_default="yue")
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    segments: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="transcript")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Transcript meeting_id={self.meeting_id}>"


