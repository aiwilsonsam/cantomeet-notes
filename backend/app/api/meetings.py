"""Meeting-related API endpoints."""

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user
from app.models.user import User
from app.db.session import get_session
from app.models.meeting import Meeting, MeetingStatus
from app.models.processing_task import ProcessingTask, TaskStatus
from app.models.summary import Summary
from app.models.transcript import Transcript
from app.models.workspace import WorkspaceMember
from app.schemas.meeting import MeetingCreate, MeetingUpdateRequest, MeetingUploadResponse
from app.schemas.meeting_extended import MeetingDetailResponse, MeetingListItemResponse
from app.services.storage_service import storage_service
from app.tasks.queue import default_queue
from app.tasks.transcription import transcribe_meeting_task
from app.utils.data_mapping import map_meeting_to_detail, map_meeting_to_list_item

router = APIRouter(prefix="/meetings", tags=["meetings"])

# Allowed audio file extensions
ALLOWED_AUDIO_EXTENSIONS = {".m4a", ".wav", ".mp3", ".aac", ".flac", ".ogg"}


def validate_audio_file(filename: str) -> None:
    """
    Validate that uploaded file has an allowed audio extension.

    Args:
        filename: Original filename

    Raises:
        HTTPException: If file extension is not allowed
    """
    from pathlib import Path

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}",
        )


@router.post("/upload", response_model=MeetingUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_meeting_audio(
    file: Annotated[UploadFile, File(description="Audio file (m4a, wav, mp3, etc.)")],
    workspaceId: Annotated[str, Form(description="Workspace ID")],
    title: Annotated[str | None, Form(description="Meeting title")] = None,
    template: Annotated[str | None, Form(description="Template name")] = None,
    tags: Annotated[str | None, Form(description="Tags as JSON array")] = None,
    description: Annotated[str | None, Form(description="Meeting description")] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> MeetingUploadResponse:
    """
    Upload a meeting audio file and create a Meeting record.

    Args:
        file: Audio file upload
        workspaceId: Workspace ID
        title: Optional meeting title (defaults to filename)
        template: Optional template name
        tags: Optional tags as JSON array string
        description: Optional meeting description
        current_user: Current authenticated user
        db: Database session

    Returns:
        Meeting upload response with meeting ID, task ID, and status
    """
    # Verify user is a member of the workspace
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspaceId,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to workspace",
        )

    # Validate file type
    validate_audio_file(file.filename or "")

    # Parse tags if provided
    tags_list = None
    if tags:
        try:
            tags_list = json.loads(tags)
            if not isinstance(tags_list, list):
                tags_list = None
        except json.JSONDecodeError:
            tags_list = None

    # Generate meeting ID
    meeting_id = str(uuid.uuid4())

    # Use filename as title if title not provided
    filename = file.filename or "Untitled Meeting"
    meeting_title = title or re.sub(r'\.[^/.]+$', '', filename).replace("_", " ")

    # Save file to storage
    try:
        storage_path = storage_service.save_file(file.file, file.filename or "audio", meeting_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        ) from e

    # Create Meeting record
    meeting = Meeting(
        id=meeting_id,
        title=meeting_title,
        description=description,
        status=MeetingStatus.UPLOADED,
        audio_path=storage_path,
        workspace_id=workspaceId,
        owner_id=current_user.id,
        template=template,
        tags=tags_list,
        # TODO: Extract audio duration using mutagen or similar library
        # audio_duration_seconds=extract_duration(storage_path),
    )

    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # Get file size
    file_size = 0
    try:
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
    except Exception:
        pass

    # Create ProcessingTask record to track transcription progress
    processing_task = ProcessingTask(
        workspace_id=workspaceId,
        filename=file.filename or "audio",
        file_size=file_size,
        status=TaskStatus.QUEUED,
        progress=0,
        logs=["File uploaded successfully"],
        meeting_id=meeting.id,
    )
    db.add(processing_task)
    db.commit()
    db.refresh(processing_task)

    # Enqueue transcription task to run in background
    # This allows the API to return immediately while transcription happens async
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Enqueuing transcription task for meeting {meeting.id}, task {processing_task.id}")
    try:
        job = default_queue.enqueue(
            transcribe_meeting_task,
            meeting.id,
            processing_task.id,  # Pass task ID to update progress
            job_timeout="2h",  # Allow up to 2 hours for long audio files
            result_ttl=86400,  # Keep result for 24 hours
            failure_ttl=86400,  # Keep failed job info for 24 hours
        )
        logger.info(f"Transcription task enqueued successfully. RQ Job ID: {job.id}, Task ID: {processing_task.id}")
    except Exception as e:
        logger.error(f"Failed to enqueue transcription task: {e}", exc_info=True)
        # Update task status to failed
        processing_task.status = TaskStatus.FAILED
        processing_task.error_message = f"Failed to enqueue task: {str(e)}"
        # Update logs
        if processing_task.logs is None:
            processing_task.logs = []
        timestamp = datetime.now(timezone.utc).strftime("%I:%M:%S %p")
        processing_task.logs.append(f"[{timestamp}] Error: Failed to enqueue transcription task: {str(e)}")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue transcription task: {str(e)}",
        ) from e

    # Update ProcessingTask with RQ job ID
    processing_task.rq_job_id = job.id
    processing_task.start_time = datetime.now(timezone.utc)
    db.commit()
    
    logger.info(f"ProcessingTask {processing_task.id} updated with RQ job ID {job.id}")

    return MeetingUploadResponse(
        meeting_id=meeting.id,
        task_id=processing_task.id,  # Return ProcessingTask ID, not RQ job ID
        message=f"Meeting audio uploaded successfully. Transcription job queued (task_id: {processing_task.id}, rq_job_id: {job.id})",
        status=meeting.status,
    )


def verify_workspace_access(
    workspace_id: str, user_id: str, db: Session
) -> WorkspaceMember:
    """
    Verify user has access to workspace.

    Args:
        workspace_id: Workspace ID
        user_id: User ID
        db: Database session

    Returns:
        WorkspaceMember if access granted

    Raises:
        HTTPException: If access denied
    """
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to workspace",
        )
    return membership


@router.get("", response_model=list[MeetingListItemResponse])
def list_meetings(
    workspace_id: Annotated[str, Query(description="Workspace ID")],
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    status_filter: Annotated[
        Optional[MeetingStatus], Query(description="Filter by status", alias="status")
    ] = None,
    sort_by: Annotated[
        str, Query(description="Sort field (created_at, recorded_at, title)")
    ] = "created_at",
    order: Annotated[str, Query(description="Sort order (asc, desc)")] = "desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[MeetingListItemResponse]:
    """
    Get list of meetings for a workspace.

    Args:
        workspace_id: Workspace ID
        page: Page number (1-based)
        page_size: Number of items per page
        status_filter: Optional status filter
        sort_by: Field to sort by
        order: Sort order (asc or desc)
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of meeting list items
    """
    # Verify workspace access
    verify_workspace_access(workspace_id, current_user.id, db)

    # Build query
    query = db.query(Meeting).filter(Meeting.workspace_id == workspace_id)

    # Apply status filter
    if status_filter:
        query = query.filter(Meeting.status == status_filter)

    # Apply sorting
    if sort_by == "created_at":
        sort_column = Meeting.created_at
    elif sort_by == "recorded_at":
        sort_column = Meeting.recorded_at
    elif sort_by == "title":
        sort_column = Meeting.title
    else:
        sort_column = Meeting.created_at

    if order.lower() == "asc":
        query = query.order_by(sort_column)
    else:
        query = query.order_by(desc(sort_column))

    # Apply pagination
    offset = (page - 1) * page_size
    meetings = query.offset(offset).limit(page_size).all()

    # Map to response format
    return [map_meeting_to_list_item(meeting) for meeting in meetings]


@router.get("/{meeting_id}", response_model=MeetingDetailResponse)
def get_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> MeetingDetailResponse:
    """
    Get detailed information about a specific meeting.

    Args:
        meeting_id: Meeting ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Meeting detail response with transcript, summary, and action items

    Raises:
        HTTPException: If meeting not found or access denied
    """
    # Load meeting with related data
    meeting = (
        db.query(Meeting)
        .options(
            joinedload(Meeting.transcript),
            joinedload(Meeting.summary),
            joinedload(Meeting.action_items),
        )
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )

    # Verify workspace access
    if meeting.workspace_id:
        verify_workspace_access(meeting.workspace_id, current_user.id, db)

    # Map to response format
    return map_meeting_to_detail(meeting, meeting.transcript, meeting.summary)


@router.patch("/{meeting_id}", response_model=MeetingDetailResponse)
def update_meeting(
    meeting_id: str,
    update_data: MeetingUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> MeetingDetailResponse:
    """
    Update a meeting's information.

    Args:
        meeting_id: Meeting ID
        update_data: Update request data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated meeting detail response

    Raises:
        HTTPException: If meeting not found or access denied
    """
    # Load meeting
    meeting = (
        db.query(Meeting)
        .options(
            joinedload(Meeting.transcript),
            joinedload(Meeting.summary),
            joinedload(Meeting.action_items),
        )
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )

    # Verify workspace access
    if meeting.workspace_id:
        verify_workspace_access(meeting.workspace_id, current_user.id, db)

    # Update basic fields
    if update_data.title is not None:
        meeting.title = update_data.title
    if update_data.tags is not None:
        meeting.tags = update_data.tags

    # Update summary fields if provided (for editing AI-generated summary)
    if update_data.summary_update:
        if not meeting.summary:
            # Create summary if it doesn't exist
            from app.models.summary import Summary

            meeting.summary = Summary(
                meeting_id=meeting_id,
                overview=update_data.summary_update.overview or "",
                detailed_minutes=update_data.summary_update.detailed_minutes,
                decisions=update_data.summary_update.decisions or [],
                highlights=update_data.summary_update.highlights or [],
            )
            db.add(meeting.summary)
        else:
            # Update existing summary
            if update_data.summary_update.overview is not None:
                meeting.summary.overview = update_data.summary_update.overview
            if update_data.summary_update.detailed_minutes is not None:
                meeting.summary.detailed_minutes = update_data.summary_update.detailed_minutes
            if update_data.summary_update.decisions is not None:
                meeting.summary.decisions = update_data.summary_update.decisions
            if update_data.summary_update.highlights is not None:
                meeting.summary.highlights = update_data.summary_update.highlights

    # Update action items if provided
    if update_data.summary and "actionItems" in update_data.summary:
        action_items_data = update_data.summary["actionItems"]
        if isinstance(action_items_data, list):
            # Map frontend status/priority to backend enum
            from app.models.action_item import ActionPriority, ActionStatus

            status_map = {
                "pending": ActionStatus.PENDING,
                "in-progress": ActionStatus.IN_PROGRESS,
                "completed": ActionStatus.DONE,
            }
            priority_map = {
                "low": ActionPriority.LOW,
                "medium": ActionPriority.MEDIUM,
                "high": ActionPriority.HIGH,
            }

            for item_data in action_items_data:
                if not isinstance(item_data, dict) or "id" not in item_data:
                    continue

                item_id = item_data["id"]
                action_item = next((ai for ai in meeting.action_items if ai.id == item_id), None)

                if action_item:
                    # Update existing action item
                    if "description" in item_data:
                        # Split description back to title/description if needed
                        description = item_data["description"]
                        if ":" in description:
                            parts = description.split(":", 1)
                            action_item.title = parts[0].strip()
                            action_item.description = parts[1].strip() if len(parts) > 1 else None
                        else:
                            action_item.title = description
                            action_item.description = None

                    if "owner" in item_data:
                        owner_str = item_data["owner"]
                        # Try to parse owner (format: "Name (email)" or "email")
                        if "(" in owner_str and ")" in owner_str:
                            name_part = owner_str.split("(")[0].strip()
                            email_part = owner_str.split("(")[1].split(")")[0].strip()
                            action_item.owner_name = name_part if name_part else None
                            action_item.owner_email = email_part
                        elif "@" in owner_str:
                            action_item.owner_email = owner_str
                            action_item.owner_name = None
                        else:
                            action_item.owner_name = owner_str
                            action_item.owner_email = None

                    if "dueDate" in item_data and item_data["dueDate"]:
                        from datetime import datetime as dt

                        try:
                            action_item.due_date = dt.fromisoformat(item_data["dueDate"]).date()
                        except (ValueError, AttributeError):
                            pass

                    if "status" in item_data:
                        status_str = item_data["status"]
                        action_item.status = status_map.get(status_str, ActionStatus.PENDING)

                    if "priority" in item_data:
                        priority_str = item_data["priority"]
                        action_item.priority = priority_map.get(priority_str, ActionPriority.MEDIUM)

    db.commit()
    db.refresh(meeting)

    # Reload related data
    db.refresh(meeting)
    if meeting.transcript:
        db.refresh(meeting.transcript)
    if meeting.summary:
        db.refresh(meeting.summary)
    for ai in meeting.action_items:
        db.refresh(ai)

    # Map to response format
    return map_meeting_to_detail(meeting, meeting.transcript, meeting.summary)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> None:
    """
    Delete a meeting and all associated data.

    Args:
        meeting_id: Meeting ID
        current_user: Current authenticated user
        db: Database session

    Raises:
        HTTPException: If meeting not found or access denied
    """
    # Load meeting
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()

    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )

    # Verify workspace access
    if meeting.workspace_id:
        verify_workspace_access(meeting.workspace_id, current_user.id, db)

    # Delete audio file if exists
    if meeting.audio_path:
        try:
            storage_service.delete_file(meeting.audio_path)
        except Exception as e:
            # Log error but don't fail the deletion
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to delete audio file {meeting.audio_path}: {e}")

    # Delete meeting (cascade will handle transcript, summary, action_items)
    db.delete(meeting)
    db.commit()

