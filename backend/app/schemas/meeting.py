"""Pydantic schemas for Meeting-related endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.meeting import MeetingStatus


class MeetingCreate(BaseModel):
    """Schema for creating a new meeting via upload."""

    title: str = Field(..., min_length=1, max_length=255, description="Meeting title")
    description: Optional[str] = Field(None, description="Optional meeting description")
    recorded_at: Optional[datetime] = Field(None, description="When the meeting was recorded")


class MeetingResponse(BaseModel):
    """Schema for meeting detail responses."""

    id: str
    title: str
    description: Optional[str]
    status: MeetingStatus
    status_reason: Optional[str]
    language_code: str
    recorded_at: Optional[datetime]
    audio_path: Optional[str]
    audio_duration_seconds: Optional[int]
    owner_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True


class MeetingListResponse(BaseModel):
    """Schema for meeting list responses."""

    id: str
    title: str
    status: MeetingStatus
    recorded_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic config."""

        from_attributes = True


class MeetingUploadResponse(BaseModel):
    """Schema for successful upload response."""

    meeting_id: str
    task_id: str | None = Field(None, description="Task ID for background processing")
    message: str
    status: MeetingStatus


class ActionItemUpdate(BaseModel):
    """Schema for updating an action item."""

    id: str
    description: Optional[str] = None
    owner: Optional[str] = None
    dueDate: Optional[str] = None  # ISO date string
    status: Optional[str] = None  # 'pending' | 'in-progress' | 'completed'
    priority: Optional[str] = None  # 'high' | 'medium' | 'low'


class SummaryUpdateRequest(BaseModel):
    """Schema for updating summary fields."""

    overview: Optional[str] = Field(None, description="Executive summary text")
    detailed_minutes: Optional[str] = Field(None, description="Detailed meeting minutes in Markdown format")
    decisions: Optional[list[dict]] = Field(None, description="List of decisions")
    highlights: Optional[list[dict]] = Field(None, description="List of highlights")


class MeetingUpdateRequest(BaseModel):
    """Schema for updating a meeting."""

    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Meeting title")
    tags: Optional[list[str]] = Field(None, description="Tags as array of strings")
    summary: Optional[dict] = Field(None, description="Summary with action items")
    summary_update: Optional[SummaryUpdateRequest] = Field(None, description="Direct summary fields update")

