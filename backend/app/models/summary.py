"""LLM-generated structured meeting summary."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models import TimestampMixin


class Summary(TimestampMixin, Base):
    """Stores structured JSON outputs from the summarization service."""

    __tablename__ = "summaries"

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
    overview: Mapped[str | None] = mapped_column(Text, nullable=True)
    detailed_minutes: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Detailed structured meeting minutes in markdown format")
    agenda_items: Mapped[list | None] = mapped_column(JSON, nullable=True)
    decisions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    highlights: Mapped[list | None] = mapped_column(JSON, nullable=True)
    generated_by_model: Mapped[str | None] = mapped_column(String(128), nullable=True)

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="summary")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Summary meeting_id={self.meeting_id}>"


