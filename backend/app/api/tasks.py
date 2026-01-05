"""Task-related API endpoints for processing tasks."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_session
from app.models.processing_task import ProcessingTask, TaskStatus
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.task import (
    FinalizeTaskRequest,
    FinalizeTaskResponse,
    ProcessingTaskDetailResponse,
    ProcessingTaskListResponse,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


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


@router.get("", response_model=list[ProcessingTaskListResponse])
def list_tasks(
    workspace_id: Annotated[str, Query(description="Workspace ID")],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[ProcessingTaskListResponse]:
    """
    Get list of processing tasks for a workspace.

    Args:
        workspace_id: Workspace ID (query parameter)
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of processing tasks
    """
    # Verify workspace access
    verify_workspace_access(workspace_id, current_user.id, db)

    # Query tasks
    tasks = (
        db.query(ProcessingTask)
        .filter(ProcessingTask.workspace_id == workspace_id)
        .order_by(ProcessingTask.created_at.desc())
        .all()
    )

    # Map to response format
    result = []
    for task in tasks:
        # Format start time
        start_time_str = ""
        if task.start_time:
            start_time_str = task.start_time.isoformat()

        result.append(
            ProcessingTaskListResponse(
                id=task.id,
                workspaceId=task.workspace_id,
                filename=task.filename,
                fileSize=task.file_size,
                status=task.status.value,
                progress=task.progress,
                logs=task.logs or [],
                startTime=start_time_str,
            )
        )

    return result


@router.get("/{task_id}", response_model=ProcessingTaskDetailResponse)
def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ProcessingTaskDetailResponse:
    """
    Get detailed information about a specific processing task.

    Args:
        task_id: Task ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Task detail response

    Raises:
        HTTPException: If task not found or access denied
    """
    # Load task
    task = db.query(ProcessingTask).filter(ProcessingTask.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Verify workspace access
    verify_workspace_access(task.workspace_id, current_user.id, db)

    # Format start time
    start_time_str = ""
    if task.start_time:
        start_time_str = task.start_time.isoformat()

    return ProcessingTaskDetailResponse(
        id=task.id,
        workspaceId=task.workspace_id,
        filename=task.filename,
        fileSize=task.file_size,
        status=task.status.value,
        progress=task.progress,
        logs=task.logs or [],
        startTime=start_time_str,
        meetingId=task.meeting_id,
        rqJobId=task.rq_job_id,
        errorMessage=task.error_message,
    )


@router.post("/{task_id}/finalize", response_model=FinalizeTaskResponse)
def finalize_task(
    task_id: str,
    request: FinalizeTaskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> FinalizeTaskResponse:
    """
    Finalize a processing task and create/update the associated meeting.

    This endpoint is called when a task is in REVIEW_READY status and the user
    wants to create a meeting record with the transcribed content.

    Args:
        task_id: Task ID
        request: Finalize task request with title, template, tags
        current_user: Current authenticated user
        db: Database session

    Returns:
        Finalize task response with meeting ID

    Raises:
        HTTPException: If task not found, access denied, or task not in correct status
    """
    # Load task
    task = db.query(ProcessingTask).filter(ProcessingTask.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Verify workspace access
    verify_workspace_access(task.workspace_id, current_user.id, db)

    # Verify task is in correct status
    # Allow REVIEW_READY, COMPLETED (if progress is 100%), or PROCESSING (if progress is 100% - transcription complete)
    # This allows finalizing after transcription completes, even if summarization is still in progress
    if task.status != TaskStatus.REVIEW_READY:
        if task.status == TaskStatus.COMPLETED and task.progress == 100:
            # Allow finalizing if task is completed with 100% progress
            # This handles cases where summarization completed but status wasn't updated
            pass
        elif task.status == TaskStatus.PROCESSING and task.progress == 100:
            # Allow finalizing if transcription is complete (100% progress) even if summarization is still processing
            # This allows users to view the meeting while AI summary is being generated
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task must be in 'review_ready' status (or 'completed'/'processing' with 100% progress) to finalize. Current status: {task.status.value}, progress: {task.progress}%",
            )

    # Find or create meeting
    from app.models.meeting import Meeting, MeetingStatus

    meeting = None
    if task.meeting_id:
        meeting = db.query(Meeting).filter(Meeting.id == task.meeting_id).first()

    if not meeting:
        # Create new meeting if it doesn't exist
        # This should rarely happen as meetings are created during upload
        # But handle it gracefully for edge cases
        meeting = Meeting(
            id=task.meeting_id or str(uuid.uuid4()),  # Use task.meeting_id if available, otherwise generate new
            title=request.title,
            workspace_id=task.workspace_id,
            owner_id=current_user.id,
            template=request.template,
            tags=request.tags,
            status=MeetingStatus.COMPLETED,
            recorded_at=task.start_time or datetime.now(timezone.utc),
        )
        db.add(meeting)
        # Update task.meeting_id if it wasn't set
        if not task.meeting_id:
            task.meeting_id = meeting.id
    else:
        # Update existing meeting with user-provided information
        meeting.title = request.title
        meeting.template = request.template
        meeting.tags = request.tags
        # Keep status as SUMMARIZING if summarization is still in progress, otherwise set to COMPLETED
        # This allows users to see the meeting while AI summary is being generated
        if meeting.status == MeetingStatus.SUMMARIZING:
            # Keep as SUMMARIZING - summarization task is still running
            pass
        elif meeting.status not in (MeetingStatus.COMPLETED, MeetingStatus.SUMMARIZING):
            meeting.status = MeetingStatus.COMPLETED

    # Update task status
    task.status = TaskStatus.COMPLETED
    task.meeting_id = meeting.id

    db.commit()
    db.refresh(meeting)
    db.refresh(task)

    return FinalizeTaskResponse(id=meeting.id)

