"""ORM models and shared mixins."""

from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """Reusable created/updated timestamp columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


__all__ = ["TimestampMixin"]

# Import models for convenient access (and Alembic autogeneration).
from .action_item import ActionItem, ActionPriority, ActionStatus  # noqa: E402
from .meeting import Meeting, MeetingStatus  # noqa: E402
from .processing_task import ProcessingTask, TaskStatus  # noqa: E402
from .summary import Summary  # noqa: E402
from .transcript import Transcript  # noqa: E402
from .user import User  # noqa: E402
from .workspace import (  # noqa: E402
    Workspace,
    WorkspaceAccessLevel,
    WorkspaceMember,
    WorkspacePlan,
    WorkspaceRole,
)

__all__ += [
    "User",
    "Meeting",
    "MeetingStatus",
    "Transcript",
    "Summary",
    "ActionItem",
    "ActionPriority",
    "ActionStatus",
    "ProcessingTask",
    "TaskStatus",
    "Workspace",
    "WorkspaceMember",
    "WorkspacePlan",
    "WorkspaceRole",
    "WorkspaceAccessLevel",
]




