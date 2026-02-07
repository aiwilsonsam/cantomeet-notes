"""Pydantic schemas for prompt template API."""

from pydantic import BaseModel, Field


class PromptTemplateCreate(BaseModel):
    """Schema for creating a prompt template."""

    workspace_id: str = Field(..., description="Workspace ID")
    name: str = Field(..., max_length=128, description="Template display name")
    content: str = Field(..., description="Prompt content with {{content}} placeholder")


class PromptTemplateUpdate(BaseModel):
    """Schema for updating a prompt template."""

    name: str | None = Field(None, max_length=128)
    content: str | None = Field(None)


class PromptTemplateResponse(BaseModel):
    """Schema for prompt template response."""

    id: str
    workspace_id: str
    name: str
    content: str
