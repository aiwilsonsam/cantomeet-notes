"""Data mapping utilities for converting backend models to frontend format."""

from datetime import datetime
from typing import Any

from app.models.action_item import ActionItem, ActionPriority, ActionStatus
from app.models.meeting import Meeting, MeetingStatus
from app.models.summary import Summary
from app.models.transcript import Transcript
from app.schemas.meeting_extended import (
    ActionItemResponse,
    KeyDecisionResponse,
    MeetingDetailResponse,
    MeetingListItemResponse,
    MeetingSummaryResponse,
    SpeakerResponse,
    TranscriptSegmentResponse,
)


def format_duration(seconds: int | None) -> str:
    """
    Format duration in seconds to human-readable string.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted string like "45 mins" or "1 hour 30 mins"
    """
    if seconds is None:
        return "0 mins"

    minutes = seconds // 60
    hours = minutes // 60
    remaining_minutes = minutes % 60

    if hours > 0:
        if remaining_minutes > 0:
            return f"{hours} hour{'s' if hours > 1 else ''} {remaining_minutes} min{'s' if remaining_minutes > 1 else ''}"
        return f"{hours} hour{'s' if hours > 1 else ''}"
    return f"{minutes} min{'s' if minutes != 1 else ''}"


def format_timestamp(seconds: float) -> str:
    """
    Format timestamp in seconds to MM:SS format.

    Args:
        seconds: Timestamp in seconds

    Returns:
        Formatted string like "00:05" or "45:30"
    """
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def map_meeting_status(status: MeetingStatus) -> str:
    """
    Map backend MeetingStatus enum to frontend string format.

    Args:
        status: Backend MeetingStatus enum

    Returns:
        Frontend status string
    """
    status_map = {
        MeetingStatus.UPLOADED: "uploaded",
        MeetingStatus.TRANSCRIBING: "transcribing",
        MeetingStatus.SUMMARIZING: "summarizing",
        MeetingStatus.COMPLETED: "completed",
        MeetingStatus.FAILED: "failed",
        MeetingStatus.SCHEDULED: "scheduled",
    }
    return status_map.get(status, "uploaded")


def map_action_status(status: ActionStatus) -> str:
    """
    Map backend ActionStatus enum to frontend string format.

    Args:
        status: Backend ActionStatus enum

    Returns:
        Frontend status string ('pending', 'in-progress', 'completed')
    """
    status_map = {
        ActionStatus.PENDING: "pending",
        ActionStatus.IN_PROGRESS: "in-progress",
        ActionStatus.DONE: "completed",
    }
    return status_map.get(status, "pending")


def map_action_priority(priority: ActionPriority) -> str:
    """
    Map backend ActionPriority enum to frontend string format.

    Args:
        priority: Backend ActionPriority enum

    Returns:
        Frontend priority string ('low', 'medium', 'high')
    """
    priority_map = {
        ActionPriority.LOW: "low",
        ActionPriority.MEDIUM: "medium",
        ActionPriority.HIGH: "high",
    }
    return priority_map.get(priority, "medium")


def convert_segments(segments: dict | list | None) -> list[TranscriptSegmentResponse]:
    """
    Convert transcript segments from backend format to frontend format.

    Backend format (from Speechmatics):
    {
        "segments": [
            {
                "start_time": 0.0,
                "end_time": 5.2,
                "text": "Hello world",
                "speaker": "Speaker 1",
                ...
            }
        ]
    }

    Frontend format:
    [
        {
            "id": "...",
            "speakerId": "...",
            "timestamp": "00:05",
            "text": "...",
            "sentiment": "..."
        }
    ]

    Args:
        segments: Backend segments format (dict or list)

    Returns:
        List of TranscriptSegmentResponse
    """
    if not segments:
        return []

    result = []
    segment_list = segments.get("segments", []) if isinstance(segments, dict) else segments

    if not isinstance(segment_list, list):
        return []

    for idx, segment in enumerate(segment_list):
        if not isinstance(segment, dict):
            continue

        # Extract data from segment
        start_time = segment.get("start_time", 0.0)
        text = segment.get("text", "")
        speaker = segment.get("speaker", "Unknown")
        sentiment = segment.get("sentiment")

        # Generate ID if not present
        segment_id = segment.get("id", f"seg_{idx}")

        # Convert speaker name to ID (simple hash or use name as ID)
        speaker_id = segment.get("speaker_id", speaker.replace(" ", "_").lower())

        result.append(
            TranscriptSegmentResponse(
                id=str(segment_id),
                speakerId=speaker_id,
                timestamp=format_timestamp(start_time),
                text=text,
                sentiment=sentiment,
            )
        )

    return result


def convert_action_items(action_items: list[ActionItem]) -> list[ActionItemResponse]:
    """
    Convert ActionItem models to frontend format.

    Args:
        action_items: List of ActionItem models

    Returns:
        List of ActionItemResponse
    """
    result = []
    for item in action_items:
        # Combine title and description
        description = item.title
        if item.description:
            description = f"{item.title}: {item.description}" if item.title else item.description

        # Format owner (combine name and email if available)
        owner = item.owner_name or ""
        if item.owner_email:
            if owner:
                owner = f"{owner} ({item.owner_email})"
            else:
                owner = item.owner_email

        # Format due date
        due_date_str = ""
        if item.due_date:
            due_date_str = item.due_date.isoformat()

        result.append(
            ActionItemResponse(
                id=item.id,
                description=description,
                owner=owner or "Unassigned",
                dueDate=due_date_str,
                status=map_action_status(item.status),
                priority=map_action_priority(item.priority),
                relatedSegmentId="",  # TODO: Add related_segment_id field to ActionItem model
                reminder=None,  # TODO: Add reminder field to ActionItem model
            )
        )

    return result


def convert_decisions(decisions: list | None) -> list[KeyDecisionResponse]:
    """
    Convert decisions from summary to frontend format.

    Args:
        decisions: List of decision dicts from Summary.decisions JSON

    Returns:
        List of KeyDecisionResponse
    """
    if not decisions or not isinstance(decisions, list):
        return []

    result = []
    for idx, decision in enumerate(decisions):
        if not isinstance(decision, dict):
            continue

        decision_id = decision.get("id", f"dec_{idx}")
        description = decision.get("description", decision.get("text", ""))
        related_segment_id = decision.get("relatedSegmentId", decision.get("segment_id", ""))

        result.append(
            KeyDecisionResponse(
                id=str(decision_id),
                description=description,
                relatedSegmentId=related_segment_id,
            )
        )

    return result


def extract_participants(transcript: Transcript | None) -> list[SpeakerResponse]:
    """
    Extract participants/speakers from transcript.

    Args:
        transcript: Transcript model

    Returns:
        List of SpeakerResponse
    """
    if not transcript or not transcript.segments:
        return []

    speakers_map: dict[str, dict[str, Any]] = {}
    segments = transcript.segments.get("segments", []) if isinstance(transcript.segments, dict) else transcript.segments

    if not isinstance(segments, list):
        return []

    for segment in segments:
        if not isinstance(segment, dict):
            continue

        speaker_name = segment.get("speaker", "Unknown")
        speaker_id = segment.get("speaker_id", speaker_name.replace(" ", "_").lower())

        if speaker_id not in speakers_map:
            speakers_map[speaker_id] = {
                "id": speaker_id,
                "name": speaker_name,
                "role": "Participant",  # Default role
                "avatar": "",  # TODO: Generate avatar from name initials
            }

    # Convert to list and generate avatars
    result = []
    for speaker_id, speaker_data in speakers_map.items():
        # Generate avatar initials
        name = speaker_data["name"]
        initials = "".join([word[0].upper() for word in name.split()[:2]]) if name else "U"
        speaker_data["avatar"] = initials

        result.append(SpeakerResponse(**speaker_data))

    return result


def map_meeting_to_list_item(meeting: Meeting) -> MeetingListItemResponse:
    """
    Map Meeting model to MeetingListItemResponse.

    Args:
        meeting: Meeting model

    Returns:
        MeetingListItemResponse
    """
    # Format date (use recorded_at or created_at)
    date_str = ""
    if meeting.recorded_at:
        date_str = meeting.recorded_at.isoformat()
    elif meeting.created_at:
        date_str = meeting.created_at.isoformat()

    # Format duration
    duration_str = format_duration(meeting.audio_duration_seconds)

    return MeetingListItemResponse(
        id=meeting.id,
        workspaceId=meeting.workspace_id or "",
        title=meeting.title,
        date=date_str,
        duration=duration_str,
        status=map_meeting_status(meeting.status),
        tags=meeting.tags or [],
        template=meeting.template,
    )


def map_meeting_to_detail(meeting: Meeting, transcript: Transcript | None, summary: Summary | None) -> MeetingDetailResponse:
    """
    Map Meeting model with related data to MeetingDetailResponse.

    Args:
        meeting: Meeting model
        transcript: Transcript model (optional)
        summary: Summary model (optional)

    Returns:
        MeetingDetailResponse
    """
    # Format date
    date_str = ""
    if meeting.recorded_at:
        date_str = meeting.recorded_at.isoformat()
    elif meeting.created_at:
        date_str = meeting.created_at.isoformat()

    # Format duration
    duration_str = format_duration(meeting.audio_duration_seconds)

    # Convert transcript segments
    transcript_segments: list[TranscriptSegmentResponse] = []
    if transcript:
        transcript_segments = convert_segments(transcript.segments)

    # Extract participants
    participants = extract_participants(transcript)

    # Convert summary
    summary_response: MeetingSummaryResponse | None = None
    if summary:
        # Convert decisions
        decisions = convert_decisions(summary.decisions)

        # Convert action items (from meeting relationship)
        action_items = convert_action_items(meeting.action_items)

        summary_response = MeetingSummaryResponse(
            executiveSummary=summary.overview or "",
            detailedMinutes=summary.detailed_minutes,
            decisions=decisions,
            actionItems=action_items,
        )

    return MeetingDetailResponse(
        id=meeting.id,
        workspaceId=meeting.workspace_id or "",
        title=meeting.title,
        date=date_str,
        duration=duration_str,
        participants=participants,
        tags=meeting.tags or [],
        transcript=transcript_segments,
        summary=summary_response,
        hubSpotSynced=meeting.hubspot_synced,
        status=map_meeting_status(meeting.status),
        template=meeting.template,
    )

