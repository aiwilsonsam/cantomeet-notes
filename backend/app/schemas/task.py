"""Pydantic schemas for Task-related endpoints."""

from typing import Optional

from pydantic import BaseModel, Field


class ProcessingTaskListResponse(BaseModel):
    """Schema for task list item response."""

    id: str
    workspaceId: str
    filename: str
    fileSize: int
    status: str  # 'queued' | 'processing' | 'review_ready' | 'completed' | 'failed'
    progress: int  # 0-100
    logs: list[str]
    startTime: str  # ISO datetime string


class ProcessingTaskDetailResponse(BaseModel):
    """Schema for task detail response."""

    id: str
    workspaceId: str
    filename: str
    fileSize: int
    status: str
    progress: int
    logs: list[str]
    startTime: str
    meetingId: Optional[str] = None
    rqJobId: Optional[str] = None
    errorMessage: Optional[str] = None


class FinalizeTaskRequest(BaseModel):
    """Schema for finalizing a task."""

    title: str = Field(..., min_length=1, max_length=255, description="Meeting title")
    template: Optional[str] = Field(None, max_length=128, description="Template name")
    tags: list[str] = Field(default_factory=list, description="Tags as array of strings")
    workspaceId: str = Field(..., description="Workspace ID")


class FinalizeTaskResponse(BaseModel):
    """Schema for finalize task response."""

    id: str  # Meeting ID

