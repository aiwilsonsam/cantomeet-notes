"""Workspace model for multi-tenant support."""

from __future__ import annotations

import uuid
from enum import Enum

from sqlalchemy import Enum as SqlEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models import TimestampMixin


class WorkspacePlan(str, Enum):
    """Workspace subscription plan."""

    FREE = "Free"
    PRO = "Pro"
    ENTERPRISE = "Enterprise"


class WorkspaceRole(str, Enum):
    """User role within a workspace."""

    ADMIN = "admin"
    MEMBER = "member"


class WorkspaceAccessLevel(str, Enum):
    """Access level for workspace members."""

    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class Workspace(TimestampMixin, Base):
    """Workspace entity for multi-tenant support."""

    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    logo: Mapped[str | None] = mapped_column(String(512), nullable=True)  # URL or initials
    plan: Mapped[WorkspacePlan] = mapped_column(
        SqlEnum(WorkspacePlan),
        default=WorkspacePlan.FREE,
        server_default=WorkspacePlan.FREE.value,
        nullable=False,
    )
    invite_code: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True, index=True)

    # Relationships
    members: Mapped[list["WorkspaceMember"]] = relationship(
        "WorkspaceMember",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
    meetings: Mapped[list["Meeting"]] = relationship("Meeting", back_populates="workspace")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Workspace id={self.id} name={self.name}>"


class WorkspaceMember(TimestampMixin, Base):
    """Many-to-many relationship between Users and Workspaces."""

    __tablename__ = "workspace_members"

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
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        SqlEnum(WorkspaceRole),
        default=WorkspaceRole.MEMBER,
        server_default=WorkspaceRole.MEMBER.value,
        nullable=False,
    )
    access_level: Mapped[WorkspaceAccessLevel] = mapped_column(
        SqlEnum(WorkspaceAccessLevel),
        default=WorkspaceAccessLevel.MEMBER,
        server_default=WorkspaceAccessLevel.MEMBER.value,
        nullable=False,
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="workspace_memberships")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<WorkspaceMember workspace_id={self.workspace_id} user_id={self.user_id} role={self.role}>"

