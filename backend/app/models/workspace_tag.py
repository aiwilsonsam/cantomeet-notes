"""Workspace tag model for global tags per workspace."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models import TimestampMixin


class WorkspaceTag(TimestampMixin, Base):
    """Workspace-scoped global tag for meetings."""

    __tablename__ = "workspace_tags"
    __table_args__ = (UniqueConstraint("workspace_id", "name", name="uq_workspace_tags_ws_name"),)

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
    name: Mapped[str] = mapped_column(String(64), nullable=False)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="workspace_tags")

    def __repr__(self) -> str:
        return f"<WorkspaceTag id={self.id} name={self.name}>"
