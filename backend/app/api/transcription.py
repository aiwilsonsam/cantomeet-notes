"""Transcription API endpoints for testing and direct transcription."""

import tempfile
from pathlib import Path
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.speechmatics_client import (
    SpeechmaticsClientError,
    get_speechmatics_client,
)

router = APIRouter(prefix="/transcription", tags=["transcription"])

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
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}",
        )


class TranscriptionResponse(BaseModel):
    """Response schema for transcription result."""

    content: str = Field(..., description="Full transcript text")
    segments: list[dict] = Field(..., description="Sentence-level transcript segments")
    duration_seconds: Optional[int] = Field(None, description="Audio duration in seconds")
    language: str = Field(..., description="Language code used for transcription")
    job_id: Optional[str] = Field(None, description="Speechmatics job ID")


class TranscriptionTestRequest(BaseModel):
    """Request schema for transcription test (with file path)."""

    file_path: str = Field(..., description="Path to audio file on server")
    language: str = Field(default="yue", description="Language code (default: yue for Cantonese)")


@router.post("/test", response_model=TranscriptionResponse, status_code=status.HTTP_200_OK)
async def test_transcription(
    file: Annotated[UploadFile, File(description="Audio file (m4a, wav, mp3, etc.)")],
    language: Annotated[str, "Language code (default: yue for Cantonese)"] = "yue",
    current_user: User = Depends(get_current_user),
) -> TranscriptionResponse:
    """
    Test transcription endpoint - directly transcribe an audio file without creating a meeting.

    This endpoint is useful for:
    - Testing Speechmatics API integration
    - Debugging transcription issues
    - Quick transcription without full meeting workflow

    Args:
        file: Audio file to transcribe
        language: Language code (default: "yue" for Cantonese)
        current_user: Current authenticated user

    Returns:
        TranscriptionResponse with transcript content and segments

    Raises:
        HTTPException: If file validation fails or transcription fails
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )
    validate_audio_file(file.filename)

    # Read file content
    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}",
        ) from e

    # Save to temporary file
    temp_file = None
    try:
        # Create temporary file with proper extension
        file_ext = Path(file.filename).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(file_content)
            temp_path = Path(temp_file.name)

        # Get Speechmatics client
        try:
            speechmatics_client = get_speechmatics_client()
        except SpeechmaticsClientError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Speechmatics client initialization failed: {str(e)}",
            ) from e

        # Create transcription job
        try:
            job_result = speechmatics_client.create_transcription_job(
                temp_path,
                language=language,
                enable_code_switching=True,  # Enable code-switching for Cantonese-English mixed audio
            )
            job_id = job_result.get("job_id")
        except SpeechmaticsClientError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create transcription job: {str(e)}",
            ) from e

        # Poll until completion
        try:
            raw_transcript = speechmatics_client.poll_until_complete(
                job_id,
                max_wait_seconds=3600,  # 1 hour max
                poll_interval_seconds=5,
            )
        except SpeechmaticsClientError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Transcription failed: {str(e)}",
            ) from e

        # Normalize transcript
        try:
            normalized = speechmatics_client.normalize_transcript(raw_transcript)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to normalize transcript: {str(e)}",
            ) from e

        return TranscriptionResponse(
            content=normalized.get("content", ""),
            segments=normalized.get("segments", []),
            duration_seconds=normalized.get("duration_seconds"),
            language=language,
            job_id=job_id,
        )

    finally:
        # Clean up temporary file
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass  # Ignore cleanup errors


@router.post("/test-file", response_model=TranscriptionResponse, status_code=status.HTTP_200_OK)
async def test_transcription_from_file(
    request: TranscriptionTestRequest,
    current_user: User = Depends(get_current_user),
) -> TranscriptionResponse:
    """
    Test transcription from a file path on the server.

    This endpoint is useful for testing with files already on the server,
    without needing to upload them again.

    Args:
        request: Transcription test request with file path and language
        current_user: Current authenticated user

    Returns:
        TranscriptionResponse with transcript content and segments

    Raises:
        HTTPException: If file not found or transcription fails
    """
    file_path = Path(request.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {request.file_path}",
        )

    # Validate file type
    validate_audio_file(str(file_path))

    # Get Speechmatics client
    try:
        speechmatics_client = get_speechmatics_client()
    except SpeechmaticsClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speechmatics client initialization failed: {str(e)}",
        ) from e

    # Create transcription job
    try:
        job_result = speechmatics_client.create_transcription_job(
            file_path,
            language=request.language,
            enable_code_switching=True,  # Enable code-switching for Cantonese-English mixed audio
        )
        job_id = job_result.get("job_id")
    except SpeechmaticsClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transcription job: {str(e)}",
        ) from e

    # Poll until completion
    try:
        raw_transcript = speechmatics_client.poll_until_complete(
            job_id,
            max_wait_seconds=3600,  # 1 hour max
            poll_interval_seconds=5,
        )
    except SpeechmaticsClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}",
        ) from e

    # Normalize transcript
    try:
        normalized = speechmatics_client.normalize_transcript(raw_transcript)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to normalize transcript: {str(e)}",
        ) from e

    return TranscriptionResponse(
        content=normalized.get("content", ""),
        segments=normalized.get("segments", []),
        duration_seconds=normalized.get("duration_seconds"),
        language=request.language,
        job_id=job_id,
    )

