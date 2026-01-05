"""Background task for generating meeting summaries using LLM."""

# Set environment variable for macOS fork() safety BEFORE any imports
import os
import sys

if sys.platform == "darwin":  # macOS
    os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"

import logging
from datetime import datetime, timezone
from typing import Any

from rq import get_current_job
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.action_item import ActionItem, ActionPriority, ActionStatus
from app.models.meeting import Meeting, MeetingStatus
from app.models.processing_task import ProcessingTask, TaskStatus
from app.models.summary import Summary
from app.models.transcript import Transcript
from app.services.summarization_service import SummarizationError, get_summarization_service

logger = logging.getLogger(__name__)


def _update_task_log(db: Session, task: ProcessingTask, message: str) -> None:
    """Helper function to add a log message to ProcessingTask."""
    if task.logs is None:
        task.logs = []
    timestamp = datetime.now(timezone.utc).strftime("%I:%M:%S %p")
    task.logs.append(f"[{timestamp}] {message}")
    db.commit()


def summarize_meeting_task(meeting_id: str, task_id: str | None = None) -> dict[str, Any]:
    """
    Background task to generate meeting summary using LLM.

    This task:
    1. Reads the transcript for the meeting
    2. Calls LLM to generate structured summary
    3. Saves summary to database
    4. Extracts and creates ActionItem records
    5. Updates meeting status to COMPLETED

    Args:
        meeting_id: Meeting ID to summarize
        task_id: Optional ProcessingTask ID for progress tracking

    Returns:
        Summary generation result

    Raises:
        SummarizationError: If summary generation fails
    """
    db = SessionLocal()
    processing_task = None

    try:
        # Get current RQ job for progress tracking
        rq_job = get_current_job()
        if rq_job:
            logger.info(f"📋 RQ Job ID: {rq_job.id}")

        # Get ProcessingTask if provided
        if task_id:
            processing_task = db.query(ProcessingTask).filter(ProcessingTask.id == task_id).first()
            if processing_task:
                processing_task.status = TaskStatus.PROCESSING
                processing_task.progress = 0
                if rq_job:
                    _update_task_log(db, processing_task, f"Starting AI summarization (RQ Job: {rq_job.id})...")
                else:
                    _update_task_log(db, processing_task, "Starting AI summarization...")
                logger.info(f"📝 ProcessingTask found: {task_id}")

        # Get meeting
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise ValueError(f"Meeting not found: {meeting_id}")

        logger.info(f"📝 Generating summary for meeting: {meeting_id}")
        logger.info(f"   Title: {meeting.title}")

        # Get transcript
        transcript = db.query(Transcript).filter(Transcript.meeting_id == meeting_id).first()
        if not transcript:
            raise ValueError(f"Transcript not found for meeting: {meeting_id}")

        if not transcript.content:
            raise ValueError(f"Transcript content is empty for meeting: {meeting_id}")

        logger.info(f"✅ Transcript found: {len(transcript.content)} chars")

        # Update meeting status
        meeting.status = MeetingStatus.SUMMARIZING
        db.commit()

        if processing_task:
            processing_task.progress = 10
            transcript_length = len(transcript.content)
            _update_task_log(db, processing_task, f"Calling LLM (gpt-4o-mini) to generate summary from {transcript_length} chars transcript...")

        # Generate summary using LLM
        logger.info("🌐 Calling LLM summarization service...")
        summarization_service = get_summarization_service()

        summary_data = summarization_service.generate_summary(
            transcript_text=transcript.content,
            meeting_title=meeting.title,
            template=meeting.template,
            language=meeting.language_code,
        )

        if processing_task:
            processing_task.progress = 60
            overview_len = len(summary_data.get("overview", ""))
            detailed_len = len(summary_data.get("detailed_minutes", "") or "")
            _update_task_log(db, processing_task, f"Summary generated (Overview: {overview_len} chars, Detailed Minutes: {detailed_len} chars). Processing results...")

        # Create or update Summary record
        summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
        if summary:
            # Update existing summary
            summary.overview = summary_data.get("overview", "")
            summary.detailed_minutes = summary_data.get("detailed_minutes")  # Can be None for short meetings
            summary.agenda_items = summary_data.get("agenda_items", [])
            summary.decisions = summary_data.get("decisions", [])
            summary.highlights = summary_data.get("highlights", [])
            summary.generated_by_model = summarization_service.model
        else:
            # Create new summary
            summary = Summary(
                meeting_id=meeting_id,
                overview=summary_data.get("overview", ""),
                detailed_minutes=summary_data.get("detailed_minutes"),  # Can be None for short meetings
                agenda_items=summary_data.get("agenda_items", []),
                decisions=summary_data.get("decisions", []),
                highlights=summary_data.get("highlights", []),
                generated_by_model=summarization_service.model,
            )
            db.add(summary)

        db.flush()  # Flush to get summary ID

        # Extract and create ActionItem records
        action_items_data = summary_data.get("action_items", [])
        logger.info(f"📋 Extracted {len(action_items_data)} action items from summary")

        if processing_task:
            processing_task.progress = 70
            _update_task_log(db, processing_task, f"Extracting action items from summary ({len(action_items_data)} found)...")

        # Delete existing action items for this meeting (we'll recreate them)
        db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).delete()

        # Create ActionItem records
        created_count = 0
        for item_data in action_items_data:
            if not isinstance(item_data, dict):
                continue

            # Map priority
            priority_str = item_data.get("priority", "medium").lower()
            try:
                priority = ActionPriority(priority_str)
            except ValueError:
                priority = ActionPriority.MEDIUM

            # Parse due date
            due_date_str = item_data.get("dueDate")
            due_date = None
            if due_date_str:
                try:
                    from datetime import date

                    # Handle ISO format with timezone
                    if "T" in due_date_str or "Z" in due_date_str:
                        due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00")).date()
                    else:
                        # Simple date format YYYY-MM-DD
                        due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
                except (ValueError, AttributeError, TypeError) as e:
                    logger.warning(f"Could not parse due date '{due_date_str}': {e}")

            # Create ActionItem
            action_item = ActionItem(
                meeting_id=meeting_id,
                title=item_data.get("description", "")[:255],  # Truncate if too long
                description=item_data.get("description", ""),
                owner_name=item_data.get("owner", "TBD"),
                due_date=due_date,
                priority=priority,
                status=ActionStatus.PENDING,
            )
            db.add(action_item)
            created_count += 1

        db.flush()

        if processing_task:
            processing_task.progress = 90
            _update_task_log(
                db,
                processing_task,
                f"Created {created_count} action items. Finalizing...",
            )

        # Update meeting status to COMPLETED
        meeting.status = MeetingStatus.COMPLETED

        # Update ProcessingTask
        # NOTE: Set status to REVIEW_READY so user can still review and finalize
        # The task will be marked as COMPLETED when user finalizes it via the API
        if processing_task:
            # Set status to REVIEW_READY (not COMPLETED) to allow user review before finalizing
            # Status will be set to COMPLETED when user calls /tasks/{id}/finalize
            processing_task.status = TaskStatus.REVIEW_READY
            processing_task.progress = 100
            overview_len = len(summary.overview or '')
            detailed_len = len(summary.detailed_minutes or '')
            _update_task_log(
                db,
                processing_task,
                f"✅ AI summarization completed successfully. Overview: {overview_len} chars, Detailed Minutes: {detailed_len} chars, {created_count} action items.",
            )
            _update_task_log(
                db,
                processing_task,
                "Ready for review. You can now configure meeting details and finalize.",
            )

        db.commit()

        logger.info(
            f"✅ Summary generation completed for meeting {meeting_id}. "
            f"Overview: {len(summary.overview or '')} chars, "
            f"Decisions: {len(summary.decisions or [])}, "
            f"Action items: {created_count}"
        )

        return {
            "meeting_id": meeting_id,
            "status": "completed",
            "overview_length": len(summary.overview or ""),
            "decisions_count": len(summary.decisions or []),
            "action_items_count": created_count,
        }

    except SummarizationError as e:
        logger.error(f"Summarization error for meeting {meeting_id}: {e}")
        # Update meeting status to failed
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = MeetingStatus.FAILED
            meeting.status_reason = f"Summarization failed: {str(e)}"
            db.commit()

        # Update ProcessingTask status to failed
        if processing_task:
            processing_task.status = TaskStatus.FAILED
            processing_task.error_message = f"Summarization failed: {str(e)}"
            _update_task_log(db, processing_task, f"Error: {str(e)}")
            db.commit()

        raise
    except Exception as e:
        logger.error(f"Unexpected error summarizing meeting {meeting_id}: {e}", exc_info=True)
        # Update meeting status to failed
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = MeetingStatus.FAILED
            meeting.status_reason = f"Unexpected error: {str(e)}"
            db.commit()

        # Update ProcessingTask status to failed
        if processing_task:
            processing_task.status = TaskStatus.FAILED
            processing_task.error_message = f"Unexpected error: {str(e)}"
            _update_task_log(db, processing_task, f"Error: {str(e)}")
            db.commit()

        raise
    finally:
        db.close()

