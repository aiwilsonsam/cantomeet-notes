"""Service for orchestrating transcription workflow."""

from pathlib import Path

from sqlalchemy.orm import Session

from app.models.meeting import Meeting, MeetingStatus
from app.models.transcript import Transcript
from app.services.speechmatics_client import (
    SpeechmaticsClientError,
    get_speechmatics_client,
)
from app.services.storage_service import storage_service


class TranscriptionService:
    """Orchestrates the transcription workflow for meetings."""

    def __init__(self) -> None:
        """Initialize transcription service."""
        self.speechmatics_client = get_speechmatics_client()

    def transcribe_meeting(self, meeting_id: str, db: Session) -> Transcript:
        """
        Transcribe a meeting's audio file using Speechmatics.

        Args:
            meeting_id: UUID of the meeting to transcribe
            db: Database session

        Returns:
            Created Transcript record

        Raises:
            ValueError: If meeting not found or invalid state
            SpeechmaticsClientError: If transcription fails
        """
        # Get meeting record
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise ValueError(f"Meeting {meeting_id} not found")

        if not meeting.audio_path:
            raise ValueError(f"Meeting {meeting_id} has no audio file")

        # Update meeting status to transcribing
        meeting.status = MeetingStatus.TRANSCRIBING
        db.commit()

        try:
            # Get audio file path
            audio_path = storage_service.get_file_path(meeting.audio_path)
            if not audio_path:
                raise ValueError(f"Audio file not found: {meeting.audio_path}")

            # Create transcription job
            job_result = self.speechmatics_client.create_transcription_job(
                audio_path,
                language=meeting.language_code,
                enable_code_switching=True,  # Enable code-switching for Cantonese-English mixed audio
            )
            job_id = job_result["job_id"]

            # Poll until completion
            raw_transcript = self.speechmatics_client.poll_until_complete(job_id)

            # Normalize transcript
            normalized = self.speechmatics_client.normalize_transcript(raw_transcript)

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

            # Update meeting status to completed (or summarizing if we have LLM step)
            meeting.status = MeetingStatus.SUMMARIZING
            db.commit()
            db.refresh(transcript)

            return transcript

        except SpeechmaticsClientError as e:
            # Update meeting status to failed
            meeting.status = MeetingStatus.FAILED
            meeting.status_reason = f"Transcription failed: {str(e)}"
            db.commit()
            raise
        except Exception as e:
            # Update meeting status to failed
            meeting.status = MeetingStatus.FAILED
            meeting.status_reason = f"Unexpected error: {str(e)}"
            db.commit()
            raise


# Singleton instance
transcription_service = TranscriptionService()

