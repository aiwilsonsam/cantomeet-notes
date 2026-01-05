"""ProcessingTask model for tracking background job status."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models import TimestampMixin


class TaskStatus(str, Enum):
    """Status of a processing task."""

    QUEUED = "queued"
    PROCESSING = "processing"
    REVIEW_READY = "review_ready"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingTask(TimestampMixin, Base):
    """Tracks background processing tasks (transcription, summarization, etc.)."""

    __tablename__ = "processing_tasks"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # Size in bytes
    status: Mapped[TaskStatus] = mapped_column(
        SqlEnum(TaskStatus),
        default=TaskStatus.QUEUED,
        server_default=TaskStatus.QUEUED.value,
        nullable=False,
    )
    progress: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )  # 0-100
    logs: Mapped[list[str] | None] = mapped_column(
        JSON, nullable=True
    )  # Array of log messages
    start_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    meeting_id: Mapped[str | None] = mapped_column(
        ForeignKey("meetings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    rq_job_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )  # RQ job ID for tracking
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProcessingTask id={self.id} status={self.status} progress={self.progress}>"

