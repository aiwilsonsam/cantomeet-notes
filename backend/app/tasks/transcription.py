"""Background task for transcribing meeting audio files."""

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
from app.models.meeting import Meeting, MeetingStatus
from app.models.processing_task import ProcessingTask, TaskStatus
from app.models.transcript import Transcript
from app.core.config import settings
from app.services.speechmatics_client import (
    SpeechmaticsClientError,
    get_speechmatics_client,
)
from app.services.whisper_client import (
    WhisperClientError,
    get_whisper_client,
)
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


def _update_task_log(db: Session, task: ProcessingTask, message: str) -> None:
    """Helper function to add a log message to ProcessingTask."""
    if task.logs is None:
        task.logs = []
    timestamp = datetime.now(timezone.utc).strftime("%I:%M:%S %p")
    task.logs.append(f"[{timestamp}] {message}")
    db.commit()


def transcribe_meeting_task(meeting_id: str, task_id: str | None = None) -> dict[str, Any]:
    """
    Background task to transcribe a meeting's audio file.

    This task:
    1. Loads the meeting from database
    2. Creates a Speechmatics transcription job
    3. Polls until completion
    4. Saves the transcript
    5. Updates meeting status to SUMMARIZING (ready for LLM summary)
    6. Updates ProcessingTask status and progress

    Args:
        meeting_id: UUID of the meeting to transcribe
        task_id: Optional ProcessingTask ID to update progress

    Returns:
        Dict with task result information

    Raises:
        Exception: If transcription fails (will be caught by RQ)
    """
    db = SessionLocal()
    job = get_current_job()

    # Load ProcessingTask if task_id provided
    processing_task = None
    if task_id:
        processing_task = db.query(ProcessingTask).filter(ProcessingTask.id == task_id).first()

    try:
        logger.info("=" * 80)
        logger.info(f"🚀 Starting transcription task")
        logger.info(f"   Meeting ID: {meeting_id}")
        logger.info(f"   Task ID: {task_id}")
        logger.info(f"   RQ Job ID: {job.id if job else 'N/A'}")
        
        # Log RQ Job ID to task logs
        if processing_task and job:
            _update_task_log(db, processing_task, f"RQ Job ID: {job.id}")
        logger.info("=" * 80)

        # Get meeting record
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"❌ Meeting {meeting_id} not found in database")
            raise ValueError(f"Meeting {meeting_id} not found")

        logger.info(f"✅ Meeting found: {meeting.title} (status: {meeting.status})")

        if not meeting.audio_path:
            logger.error(f"❌ Meeting {meeting_id} has no audio file")
            raise ValueError(f"Meeting {meeting_id} has no audio file")
        
        logger.info(f"📁 Audio path: {meeting.audio_path}")

        # Update ProcessingTask status to PROCESSING
        if processing_task:
            logger.info(f"✅ ProcessingTask found: {processing_task.id} (current status: {processing_task.status})")
            processing_task.status = TaskStatus.PROCESSING
            processing_task.progress = 5
            _update_task_log(db, processing_task, "Starting transcription...")
            logger.info(f"📝 Updated ProcessingTask status to PROCESSING, progress to 5%")
        else:
            logger.warning(f"⚠️  No ProcessingTask found with task_id={task_id}, searching by meeting_id...")
            # If no ProcessingTask, try to find one by meeting_id
            processing_task = (
                db.query(ProcessingTask)
                .filter(ProcessingTask.meeting_id == meeting_id)
                .order_by(ProcessingTask.created_at.desc())
                .first()
            )
            if processing_task:
                logger.info(f"✅ Found ProcessingTask by meeting_id: {processing_task.id}")
                processing_task.status = TaskStatus.PROCESSING
                processing_task.progress = 5
                _update_task_log(db, processing_task, "Starting transcription...")
                logger.info(f"📝 Updated ProcessingTask status to PROCESSING, progress to 5%")
            else:
                logger.warning(f"⚠️  No ProcessingTask found for meeting {meeting_id}, continuing without task tracking")

        # Update meeting status to transcribing
        meeting.status = MeetingStatus.TRANSCRIBING
        db.commit()

        # Get audio file path
        logger.info(f"🔍 Looking for audio file at: {meeting.audio_path}")
        audio_path = storage_service.get_file_path(meeting.audio_path)
        if not audio_path:
            logger.error(f"❌ Audio file not found: {meeting.audio_path}")
            raise ValueError(f"Audio file not found: {meeting.audio_path}")
        
        logger.info(f"✅ Audio file found: {audio_path}")
        
        # Get file size for logging
        import os
        file_size_mb = 0
        if os.path.exists(audio_path):
            file_size_mb = round(os.path.getsize(audio_path) / (1024 * 1024), 2)
            if processing_task:
                _update_task_log(db, processing_task, f"Audio file: {os.path.basename(audio_path)} ({file_size_mb} MB)")

        # Create Speechmatics client and transcription job
        if processing_task:
            processing_task.progress = 10
            _update_task_log(db, processing_task, "Initializing transcription service...")
            logger.info(f"📝 Updated progress to 10%: Creating Speechmatics job...")

        # Select ASR provider based on configuration
        asr_provider = settings.asr_provider
        logger.info(f"🌐 Using ASR provider: {asr_provider}")

        if asr_provider == "whisper":
            # Use Whisper API for better mixed language support
            logger.info(f"🌐 Initializing Whisper API client...")
            whisper_client = get_whisper_client()
            logger.info(f"✅ Whisper API client initialized")
            
            logger.info(f"📤 Transcribing with Whisper API...")
            logger.info(f"   Audio file: {audio_path}")
            logger.info(f"   Language: {meeting.language_code} (auto-detect if None)")

            if processing_task:
                processing_task.progress = 20
                _update_task_log(db, processing_task, f"Transcribing with Whisper API (language: {meeting.language_code or 'auto-detect'})...")

            # Whisper API is synchronous, so we transcribe directly
            raw_transcript = whisper_client.transcribe(
                audio_path,
                language=meeting.language_code if meeting.language_code != "yue" else None,  # Auto-detect for mixed language
                task="transcribe",  # Keep original language
            )

            if processing_task:
                processing_task.progress = 90
                transcript_length = len(raw_transcript.get("text", ""))
                _update_task_log(db, processing_task, f"Whisper transcription completed ({transcript_length} chars). Processing results...")

            # Normalize transcript
            normalized = whisper_client.normalize_transcript(raw_transcript)

        else:
            # Use Speechmatics (default)
            logger.info(f"🌐 Initializing Speechmatics client...")
            speechmatics_client = get_speechmatics_client()
            logger.info(f"✅ Speechmatics client initialized")
            
            logger.info(f"📤 Creating Speechmatics transcription job...")
            logger.info(f"   Audio file: {audio_path}")
            logger.info(f"   Language: {meeting.language_code}")
            
            job_result = speechmatics_client.create_transcription_job(
                audio_path,
                language=meeting.language_code,
                enable_code_switching=True,  # Enable code-switching for Cantonese-English mixed audio
            )
            speechmatics_job_id = job_result["job_id"]

            logger.info(f"✅ Speechmatics job created successfully!")
            logger.info(f"   Job ID: {speechmatics_job_id}")
            logger.info(f"   Status: {job_result.get('status', 'unknown')}")

            if processing_task:
                processing_task.progress = 15
                _update_task_log(
                    db,
                    processing_task,
                    f"Speechmatics job created: {speechmatics_job_id}. Polling for completion...",
                )

            # Poll until completion (this may take 10-30 minutes for long files)
            # RQ will handle the long-running nature of this task
            # Update progress during polling
            def progress_callback(current_progress: int) -> None:
                """Callback to update progress during polling."""
                if processing_task:
                    # Progress from 15% to 90% during polling
                    progress = 15 + int((current_progress / 100) * 75)
                    processing_task.progress = min(progress, 90)
                    db.commit()

            # Note: speechmatics_client.poll_until_complete doesn't support progress callback yet
            # We'll update progress periodically based on elapsed time
            raw_transcript = speechmatics_client.poll_until_complete(speechmatics_job_id)

            # Normalize transcript
            if processing_task:
                processing_task.progress = 90
                _update_task_log(db, processing_task, "Transcription completed. Processing results...")

            normalized = speechmatics_client.normalize_transcript(raw_transcript)

        # Create or update Transcript record
        transcript = db.query(Transcript).filter(Transcript.meeting_id == meeting_id).first()
        if transcript:
            # Update existing transcript
            transcript.content = normalized["content"]
            transcript.segments = normalized["segments"]
            transcript.duration_seconds = normalized["duration_seconds"]
            transcript.raw_response = normalized["raw_response"]
        else:
            # Create new transcript
            transcript = Transcript(
                meeting_id=meeting_id,
                language_code=meeting.language_code,
                content=normalized["content"],
                segments=normalized["segments"],
                duration_seconds=normalized["duration_seconds"],
                raw_response=normalized["raw_response"],
            )
            db.add(transcript)

        # Update meeting status to SUMMARIZING (ready for LLM summary task)
        meeting.status = MeetingStatus.SUMMARIZING

        # Update ProcessingTask to REVIEW_READY (transcription complete, ready for review)
        if processing_task:
            processing_task.status = TaskStatus.REVIEW_READY
            processing_task.progress = 100
            transcript_length = len(normalized['content'])
            duration_mins = round(normalized.get('duration_seconds', 0) / 60, 1)
            _update_task_log(
                db,
                processing_task,
                f"✅ Transcription completed successfully. Transcript: {transcript_length} chars, Duration: {duration_mins} mins",
            )

        db.commit()

        logger.info(f"Transcription completed for meeting {meeting_id}. Transcript length: {len(normalized['content'])} chars")

        # Automatically trigger summarization task
        try:
            from app.tasks.summarization import summarize_meeting_task
            from app.tasks.queue import default_queue

            # Enqueue summarization task
            summarization_job = default_queue.enqueue(
                summarize_meeting_task,
                meeting_id,
                task_id=task_id,  # Pass the same task_id for progress tracking
                job_timeout="30m",  # 30 minutes timeout for LLM processing
            )
            logger.info(f"✅ Summarization task enqueued: {summarization_job.id}")
            logger.info(f"   Meeting will be summarized automatically")
            if processing_task:
                _update_task_log(db, processing_task, f"Enqueued summarization task (RQ Job: {summarization_job.id})")
        except Exception as e:
            logger.error(f"⚠️  Failed to enqueue summarization task: {e}")
            logger.error(f"   Meeting status is SUMMARIZING, but summarization task was not enqueued")
            # Don't raise - transcription succeeded, summarization can be retried manually

        return {
            "meeting_id": meeting_id,
            "status": "completed",
            "transcript_length": len(normalized["content"]),
            "duration_seconds": normalized["duration_seconds"],
        }

    except (SpeechmaticsClientError, WhisperClientError) as e:
        logger.error(f"ASR provider error for meeting {meeting_id}: {e}")
        # Update meeting status to failed
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.status = MeetingStatus.FAILED
            meeting.status_reason = f"Transcription failed: {str(e)}"
            db.commit()

        # Update ProcessingTask status to failed
        if processing_task:
            processing_task.status = TaskStatus.FAILED
            processing_task.error_message = f"Transcription failed: {str(e)}"
            _update_task_log(db, processing_task, f"Error: {str(e)}")
            db.commit()

        raise
    except Exception as e:
        logger.error(f"Unexpected error transcribing meeting {meeting_id}: {e}", exc_info=True)
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

