"""Extended Pydantic schemas for Meeting API responses matching frontend format."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.meeting import MeetingStatus


class SpeakerResponse(BaseModel):
    """Speaker information."""

    id: str
    name: str
    role: str
    avatar: str


class TranscriptSegmentResponse(BaseModel):
    """Transcript segment matching frontend format."""

    id: str
    speakerId: str
    timestamp: str  # Format: "MM:SS"
    text: str
    sentiment: Optional[str] = None  # 'neutral' | 'positive' | 'negative' | 'concerned'


class ActionItemResponse(BaseModel):
    """Action item matching frontend format."""

    id: str
    description: str
    owner: str
    dueDate: str  # ISO date string
    status: str  # 'pending' | 'in-progress' | 'completed'
    priority: Optional[str] = None  # 'high' | 'medium' | 'low'
    relatedSegmentId: str
    reminder: Optional[str] = None


class KeyDecisionResponse(BaseModel):
    """Key decision matching frontend format."""

    id: str
    description: str
    relatedSegmentId: str


class MeetingSummaryResponse(BaseModel):
    """Meeting summary matching frontend format."""

    executiveSummary: str
    detailedMinutes: Optional[str] = None  # Detailed meeting minutes in Markdown format
    decisions: list[KeyDecisionResponse]
    actionItems: list[ActionItemResponse]


class MeetingDetailResponse(BaseModel):
    """Complete meeting detail response matching frontend format."""

    id: str
    workspaceId: str
    title: str
    date: str  # ISO datetime string
    duration: str  # Format: "45 mins"
    participants: list[SpeakerResponse]
    tags: list[str]
    transcript: list[TranscriptSegmentResponse]
    summary: Optional[MeetingSummaryResponse] = None
    hubSpotSynced: bool
    status: str  # 'uploaded' | 'transcribing' | 'summarizing' | 'completed' | 'failed' | 'scheduled'
    template: Optional[str] = None


class MeetingListItemResponse(BaseModel):
    """Meeting list item response (simplified)."""

    id: str
    workspaceId: str
    title: str
    date: str  # ISO datetime string
    duration: str  # Format: "45 mins"
    status: str
    tags: list[str]
    template: Optional[str] = None

