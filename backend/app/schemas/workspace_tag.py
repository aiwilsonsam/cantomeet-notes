"""Pydantic schemas for workspace tag API."""

from pydantic import BaseModel, Field


class WorkspaceTagCreate(BaseModel):
    """Schema for creating a workspace tag."""

    workspace_id: str = Field(..., description="Workspace ID")
    name: str = Field(..., max_length=64, description="Tag name")


class WorkspaceTagResponse(BaseModel):
    """Schema for workspace tag response."""

    id: str
    workspace_id: str
    name: str


# Seed tags for new workspaces
DEFAULT_WORKSPACE_TAGS = ["Internal", "External", "Strategic"]
