"""Action items derived from meeting summaries."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Date, DateTime, Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models import TimestampMixin


class ActionPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ActionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class ActionItem(TimestampMixin, Base):
    """Discrete tasks produced from meeting decisions."""

    __tablename__ = "action_items"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    meeting_id: Mapped[str] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    owner_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    priority: Mapped[ActionPriority] = mapped_column(
        SqlEnum(ActionPriority),
        default=ActionPriority.MEDIUM,
        server_default=ActionPriority.MEDIUM.value,
        nullable=False,
    )
    status: Mapped[ActionStatus] = mapped_column(
        SqlEnum(ActionStatus),
        default=ActionStatus.PENDING,
        server_default=ActionStatus.PENDING.value,
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="action_items")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ActionItem id={self.id} meeting_id={self.meeting_id} status={self.status}>"


