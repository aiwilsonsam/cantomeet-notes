"""Speechmatics ASR API client for Cantonese transcription.

Based on Speechmatics Batch Transcription API v2:
https://docs.speechmatics.com/get-started/authentication
"""

# Set environment variable for macOS fork() safety BEFORE importing httpx
import os
import sys

if sys.platform == "darwin":  # macOS
    os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"

import json
import time
from pathlib import Path
from typing import Any

import httpx

from app.core.config import settings


class SpeechmaticsClientError(Exception):
    """Base exception for Speechmatics client errors."""


class SpeechmaticsClient:
    """Client for interacting with Speechmatics Batch Transcription API v2."""

    def __init__(self) -> None:
        """Initialize Speechmatics client with configuration."""
        if not settings.speechmatics_api_key:
            raise SpeechmaticsClientError(
                "SPEECHMATICS_API_KEY is not configured. Set it in environment variables."
            )

        self.api_key = settings.speechmatics_api_key
        # Default to Speechmatics production Batch API endpoint
        # See: https://docs.speechmatics.com/get-started/authentication#supported-endpoints
        if settings.speechmatics_base_url:
            base = str(settings.speechmatics_base_url).rstrip("/")
            # Ensure it's the Batch API endpoint, not the management portal
            if "mp.speechmatics.com" in base:
                # Replace mp.speechmatics.com with asr.api.speechmatics.com
                base = base.replace("mp.speechmatics.com", "asr.api.speechmatics.com")
            self.base_url = base
        else:
            # Default production endpoint for Batch Transcription
            self.base_url = "https://asr.api.speechmatics.com"
        
        # Base headers (Content-Type will be set per request)
        self.auth_header = {"Authorization": f"Bearer {self.api_key}"}

    def create_transcription_job(
        self,
        audio_file_path: Path,
        language: str = "yue",  # Cantonese language code (ISO 639-3)
        enable_code_switching: bool = True,  # Enable code-switching for mixed languages
    ) -> dict[str, Any]:
        """
        Create a transcription job for an audio file.

        According to Speechmatics Batch API v2, jobs are created by uploading
        a multipart/form-data request with both config and audio file.
        The API returns results in json_v2 format by default.

        For Cantonese-English mixed audio, this method attempts to enable
        code-switching support. Note: Speechmatics may not have explicit
        bilingual support for Cantonese-English, but we try to optimize
        the configuration for mixed-language scenarios.

        Args:
            audio_file_path: Path to the audio file to transcribe
            language: Language code (default: "yue" for Cantonese)
            enable_code_switching: Enable code-switching mode for mixed languages
                                 (default: True for better English recognition)

        Returns:
            Job creation response with job_id and status

        Raises:
            SpeechmaticsClientError: If job creation fails
        """
        if not audio_file_path.exists():
            raise SpeechmaticsClientError(f"Audio file not found: {audio_file_path}")

        # Speechmatics Batch API v2 requires multipart/form-data with:
        # - config: JSON string containing job configuration
        # - data_file: The audio file
        # 
        # For mixed Cantonese-English transcription, we configure:
        # - language: "yue" (Cantonese) as primary language
        # - domain: Try to use a domain that might help with English recognition
        # - Additional options for better code-switching support
        #
        # Note: Speechmatics may not have explicit "bilingual-en" domain for Cantonese
        # like it does for Spanish, but we try to optimize the configuration.
        transcription_config = {
            "language": language,
        }
        
        # For Cantonese-English code-switching, try to optimize configuration
        # Speechmatics might handle English words better with certain settings
        if enable_code_switching and language == "yue":
            # Attempt to optimize for mixed-language scenarios
            # Note: Speechmatics may not have explicit "bilingual-en" domain for Cantonese
            # like it does for Spanish, but we try to use settings that might help
            # 
            # Some Speechmatics configurations may support:
            # - domain: "general" or "conversational" for better mixed-language handling
            # - Additional parameters for code-switching (if available in API version)
            #
            # If these settings are not supported, the API will return an error
            # and we'll need to fall back to basic configuration or contact support
            transcription_config["domain"] = "general"
        
        job_config = {
            "type": "transcription",
            "transcription_config": transcription_config,
        }

        # Log the configuration being sent (for debugging)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"📤 Speechmatics job config: {json.dumps(job_config, indent=2)}")
        logger.info(f"   Language: {language}, Code-switching enabled: {enable_code_switching}")

        create_url = f"{self.base_url}/v2/jobs"
        
        try:
            with httpx.Client(timeout=60.0) as client:
                # Open audio file and prepare multipart form data
                with open(audio_file_path, "rb") as audio_file:
                    # Determine content type based on file extension
                    content_type = self._get_content_type(audio_file_path)
                    
                    files = {
                        "data_file": (
                            audio_file_path.name,
                            audio_file,
                            content_type,
                        )
                    }
                    data = {
                        "config": json.dumps(job_config)
                    }
                    
                    # Use auth header only (no Content-Type for multipart)
                    response = client.post(
                        create_url,
                        headers=self.auth_header,
                        data=data,
                        files=files,
                    )
                    response.raise_for_status()
                    job_data = response.json()

                job_id = job_data.get("id")
                if not job_id:
                    raise SpeechmaticsClientError("No job ID returned from Speechmatics API")

                return {
                    "job_id": job_id,
                    "status": job_data.get("status", "running"),
                }

        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            try:
                error_json = e.response.json()
                error_detail = error_json.get("detail", error_detail)
            except Exception:
                pass
            raise SpeechmaticsClientError(
                f"Speechmatics API error: {e.response.status_code} - {error_detail}"
            ) from e
        except httpx.RequestError as e:
            raise SpeechmaticsClientError(f"Request failed: {str(e)}") from e

    def _get_content_type(self, file_path: Path) -> str:
        """Get MIME type based on file extension."""
        ext = file_path.suffix.lower()
        content_types = {
            ".m4a": "audio/mp4",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".aac": "audio/aac",
            ".flac": "audio/flac",
            ".ogg": "audio/ogg",
            ".opus": "audio/opus",
        }
        return content_types.get(ext, "audio/mpeg")

    def get_job_status(self, job_id: str) -> dict[str, Any]:
        """
        Get the status of a transcription job.

        Args:
            job_id: Job ID from create_transcription_job

        Returns:
            Job status information

        Raises:
            SpeechmaticsClientError: If status check fails
        """
        status_url = f"{self.base_url}/v2/jobs/{job_id}"
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(status_url, headers=self.auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            try:
                error_json = e.response.json()
                error_detail = error_json.get("detail", error_detail)
            except Exception:
                pass
            raise SpeechmaticsClientError(
                f"Failed to get job status: {e.response.status_code} - {error_detail}"
            ) from e
        except httpx.RequestError as e:
            raise SpeechmaticsClientError(f"Request failed: {str(e)}") from e

    def get_transcript(self, job_id: str) -> dict[str, Any]:
        """
        Get the transcript result for a completed job.

        Args:
            job_id: Job ID from create_transcription_job

        Returns:
            Transcript data in the requested format (json_v2)

        Raises:
            SpeechmaticsClientError: If transcript retrieval fails
        """
        transcript_url = f"{self.base_url}/v2/jobs/{job_id}/transcript"
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(transcript_url, headers=self.auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            try:
                error_json = e.response.json()
                error_detail = error_json.get("detail", error_detail)
            except Exception:
                pass
            raise SpeechmaticsClientError(
                f"Failed to get transcript: {e.response.status_code} - {error_detail}"
            ) from e
        except httpx.RequestError as e:
            raise SpeechmaticsClientError(f"Request failed: {str(e)}") from e

    def poll_until_complete(
        self,
        job_id: str,
        max_wait_seconds: int = 3600,
        poll_interval_seconds: int = 5,
    ) -> dict[str, Any]:
        """
        Poll job status until completion or timeout.

        Args:
            job_id: Job ID to poll
            max_wait_seconds: Maximum time to wait (default: 1 hour)
            poll_interval_seconds: Seconds between polls (default: 5)

        Returns:
            Final transcript result

        Raises:
            SpeechmaticsClientError: If job fails or times out
        """
        start_time = time.time()
        poll_count = 0
        
        while True:
            status_response = self.get_job_status(job_id)
            poll_count += 1
            
            # Speechmatics API returns nested structure: {"job": {"status": "...", ...}}
            # Extract the job object first
            job_data = status_response.get("job", status_response)
            
            # Try to get status from job object or top level
            job_status = (
                job_data.get("status") or
                status_response.get("status") or
                status_response.get("job_status") or
                status_response.get("state") or
                "unknown"
            )
            job_status_lower = str(job_status).lower()

            # Debug: print status on first poll or if status is unknown
            if poll_count == 1 or job_status_lower == "unknown":
                print(f"Job {job_id} status response (poll #{poll_count}): {status_response}")

            if job_status_lower == "done":
                return self.get_transcript(job_id)
            elif job_status_lower in ("failed", "rejected", "error"):
                error_msg = (
                    job_data.get("error") or
                    status_response.get("error") or
                    job_data.get("detail") or
                    status_response.get("detail") or
                    job_data.get("message") or
                    status_response.get("message") or
                    "Unknown error"
                )
                raise SpeechmaticsClientError(f"Job {job_id} failed: {error_msg}")
            elif job_status_lower in ("running", "queued", "processing", "transcribing", "started"):
                elapsed = time.time() - start_time
                if elapsed > max_wait_seconds:
                    raise SpeechmaticsClientError(
                        f"Job {job_id} timed out after {max_wait_seconds} seconds"
                    )
                # Log progress for long-running jobs
                if int(elapsed) % 30 == 0:  # Every 30 seconds
                    print(f"Job {job_id} still processing... (status: {job_status}, elapsed: {int(elapsed)}s)")
                time.sleep(poll_interval_seconds)
            else:
                # If status is truly unknown, show the full response for debugging
                raise SpeechmaticsClientError(
                    f"Unknown job status: {job_status}. Full response: {status_response}"
                )

    def normalize_transcript(self, speechmatics_response: dict[str, Any]) -> dict[str, Any]:
        """
        Normalize Speechmatics API response (json_v2 format) to our internal format.

        Speechmatics json_v2 format structure:
        {
            "metadata": {...},
            "results": [
                {
                    "alternatives": [
                        {
                            "content": "full text",
                            "words": [
                                {
                                    "word": "...",
                                    "start_time": 0.0,
                                    "end_time": 1.0,
                                    "confidence": 0.95
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        Args:
            speechmatics_response: Raw response from Speechmatics API (json_v2 format)

        Returns:
            Normalized transcript structure with content and segments
        """
        # Extract full text content from json_v2 format
        results = speechmatics_response.get("results", [])
        
        # Collect all text content
        content_parts = []
        all_words = []
        
        for result in results:
            alternatives = result.get("alternatives", [])
            for alt in alternatives:
                # Extract full text
                alt_content = alt.get("content", "").strip()
                if alt_content:
                    content_parts.append(alt_content)
                
                # Extract word-level data with timestamps
                words = alt.get("words", [])
                for word in words:
                    all_words.append({
                        "word": word.get("word", ""),
                        "start_time": word.get("start_time", 0.0),
                        "end_time": word.get("end_time", 0.0),
                        "confidence": word.get("confidence", 0.0),
                        "speaker": word.get("speaker", "Unknown"),  # Speaker diarization if available
                        "speaker_id": word.get("speaker_id", None),
                    })

        # Join all content parts
        content = " ".join(content_parts) if content_parts else ""
        
        # If no content from alternatives, try fallback
        if not content:
            content = speechmatics_response.get("text", "")

        # Group words into sentence-level segments
        # Each segment should contain a complete phrase or sentence
        segments = []
        if all_words:
            current_segment = {
                "words": [],
                "start_time": all_words[0]["start_time"] if all_words else 0.0,
                "speaker": all_words[0].get("speaker", "Unknown"),
                "speaker_id": all_words[0].get("speaker_id", None),
            }
            
            # Sentence-ending punctuation
            sentence_endings = {".", "!", "?", "。", "！", "？"}
            # Maximum segment duration (seconds) - split long segments
            max_segment_duration = 10.0
            # Maximum words per segment
            max_words_per_segment = 30
            
            for i, word_data in enumerate(all_words):
                word = word_data["word"]
                start_time = word_data["start_time"]
                end_time = word_data["end_time"]
                speaker = word_data.get("speaker", "Unknown")
                speaker_id = word_data.get("speaker_id")
                
                # Check if we should start a new segment
                should_split = False
                
                # Split on speaker change
                if speaker != current_segment["speaker"]:
                    should_split = True
                
                # Split on sentence ending
                elif word.strip() and word.strip()[-1] in sentence_endings:
                    should_split = True
                
                # Split if segment too long
                elif (end_time - current_segment["start_time"]) > max_segment_duration:
                    should_split = True
                
                # Split if too many words
                elif len(current_segment["words"]) >= max_words_per_segment:
                    should_split = True
                
                if should_split and current_segment["words"]:
                    # Finalize current segment
                    segment_text = " ".join([w["word"] for w in current_segment["words"]])
                    segments.append({
                        "id": f"seg_{len(segments)}",
                        "text": segment_text,
                        "start_time": current_segment["start_time"],
                        "end_time": current_segment["words"][-1]["end_time"],
                        "speaker": current_segment["speaker"],
                        "speaker_id": current_segment["speaker_id"] or current_segment["speaker"].replace(" ", "_").lower(),
                    })
                    
                    # Start new segment
                    current_segment = {
                        "words": [],
                        "start_time": start_time,
                        "speaker": speaker,
                        "speaker_id": speaker_id,
                    }
                
                current_segment["words"].append(word_data)
            
            # Add final segment
            if current_segment["words"]:
                segment_text = " ".join([w["word"] for w in current_segment["words"]])
                segments.append({
                    "id": f"seg_{len(segments)}",
                    "text": segment_text,
                    "start_time": current_segment["start_time"],
                    "end_time": current_segment["words"][-1]["end_time"],
                    "speaker": current_segment["speaker"],
                    "speaker_id": current_segment["speaker_id"] or current_segment["speaker"].replace(" ", "_").lower(),
                })

        # Calculate duration from segments if available
        duration_seconds = None
        if segments:
            last_segment = segments[-1]
            duration_seconds = int(last_segment.get("end_time", 0))
        elif all_words:
            duration_seconds = int(all_words[-1]["end_time"])
        else:
            # Try to get duration from metadata
            metadata = speechmatics_response.get("metadata", {})
            duration_seconds = metadata.get("duration", None)

        return {
            "content": content,
            "segments": segments,
            "duration_seconds": duration_seconds,
            "raw_response": speechmatics_response,
        }


# Singleton instance (will be initialized when needed)
_speechmatics_client: SpeechmaticsClient | None = None


def get_speechmatics_client() -> SpeechmaticsClient:
    """Get or create Speechmatics client instance."""
    global _speechmatics_client
    if _speechmatics_client is None:
        _speechmatics_client = SpeechmaticsClient()
    return _speechmatics_client

