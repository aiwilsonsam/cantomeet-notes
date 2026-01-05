"""Pydantic schemas for workspace endpoints."""

from pydantic import BaseModel, Field

from app.models.workspace import WorkspacePlan, WorkspaceRole


class WorkspaceResponse(BaseModel):
    """Schema for workspace responses."""

    id: str
    name: str
    logo: str | None
    plan: WorkspacePlan
    role: WorkspaceRole | None = None  # User's role in this workspace

    class Config:
        """Pydantic config."""

        from_attributes = True


class CreateWorkspaceRequest(BaseModel):
    """Schema for creating a workspace."""

    name: str = Field(..., min_length=1, max_length=255, description="Workspace name")
    plan: WorkspacePlan = Field(default=WorkspacePlan.FREE, description="Workspace plan")


class JoinWorkspaceRequest(BaseModel):
    """Schema for joining a workspace via invite code."""

    inviteCode: str = Field(..., min_length=1, description="Workspace invite code")


class WorkspaceMemberResponse(BaseModel):
    """Schema for workspace member information."""

    id: str
    workspaceId: str
    userId: str
    role: WorkspaceRole
    accessLevel: str

    class Config:
        """Pydantic config."""

        from_attributes = True

