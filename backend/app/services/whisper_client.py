"""OpenAI Whisper API client for Cantonese-English mixed transcription.

Whisper supports multilingual code-switching natively, making it ideal
for Cantonese-English mixed audio transcription.
"""

import logging
import ssl
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class WhisperClientError(Exception):
    """Base exception for Whisper client errors."""


class WhisperAPIClient:
    """Client for OpenAI Whisper API (cloud-based)."""

    def __init__(self) -> None:
        """Initialize Whisper API client."""
        if not settings.openai_api_key:
            raise WhisperClientError(
                "OPENAI_API_KEY is not configured. Set it in environment variables."
            )

        try:
            from openai import OpenAI
            import certifi
            import httpx
            import os

            # Fix SSL certificate issues on macOS
            # Method 1: Set environment variables (works for requests, urllib, etc.)
            cert_path = certifi.where()
            os.environ.setdefault("REQUESTS_CA_BUNDLE", cert_path)
            os.environ.setdefault("SSL_CERT_FILE", cert_path)
            os.environ.setdefault("CURL_CA_BUNDLE", cert_path)
            
            # Method 2: Create SSL context with certifi certificates
            # This is the most reliable method for httpx
            ssl_context = ssl.create_default_context(cafile=cert_path)
            
            # Create httpx client with SSL context
            # httpx accepts verify as:
            # - bool: True/False
            # - str: path to CA bundle
            # - ssl.SSLContext: SSL context object (most reliable)
            http_client = httpx.Client(
                timeout=httpx.Timeout(300.0, connect=30.0),  # 5 min total, 30s connect
                verify=ssl_context,  # Use SSL context with certifi certificates
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            )
            
            self.client = OpenAI(
                api_key=settings.openai_api_key,
                http_client=http_client,
            )
            logger.info("✅ Whisper API client initialized")
            logger.info(f"   SSL certificates from: {cert_path}")
            logger.info(f"   SSL context configured with certifi")
        except ImportError as e:
            missing_package = "openai" if "openai" in str(e) else "certifi"
            raise WhisperClientError(
                f"{missing_package} package is not installed. Install it with: pip install openai certifi"
            )

    def transcribe(
        self,
        audio_file_path: Path,
        language: str | None = "yue",  # Cantonese, or None for auto-detect
        task: str = "transcribe",  # "transcribe" or "translate"
    ) -> dict[str, Any]:
        """
        Transcribe audio file using OpenAI Whisper API.

        Whisper natively supports code-switching, so it can handle
        Cantonese-English mixed audio without special configuration.

        Args:
            audio_file_path: Path to the audio file to transcribe
            language: Language code (default: "yue" for Cantonese, None for auto-detect)
            task: "transcribe" (keep original language) or "translate" (to English)

        Returns:
            Transcription result with text and segments

        Raises:
            WhisperClientError: If transcription fails
        """
        if not audio_file_path.exists():
            raise WhisperClientError(f"Audio file not found: {audio_file_path}")

        logger.info(f"📤 Transcribing with Whisper API: {audio_file_path.name}")
        logger.info(f"   Language: {language or 'auto-detect'}, Task: {task}")

        try:
            with open(audio_file_path, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language,  # "yue" for Cantonese, None for auto-detect
                    response_format="verbose_json",  # Get detailed response with segments
                    timestamp_granularities=["segment", "word"],  # Get both segment and word-level timestamps
                )

            # Convert to our internal format
            result = transcript.model_dump()

            logger.info(f"✅ Whisper transcription completed")
            logger.info(f"   Text length: {len(result.get('text', ''))} chars")

            return result

        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Whisper API error: {error_msg}")
            raise WhisperClientError(f"Whisper API error: {error_msg}") from e

    def normalize_transcript(self, whisper_response: dict[str, Any]) -> dict[str, Any]:
        """
        Normalize Whisper API response to our internal format.

        Whisper API response format:
        {
            "text": "full transcript text",
            "language": "yue",
            "duration": 123.45,
            "words": [
                {
                    "word": "...",
                    "start": 0.0,
                    "end": 1.0,
                }
            ],
            "segments": [
                {
                    "id": 0,
                    "seek": 0,
                    "start": 0.0,
                    "end": 5.0,
                    "text": "segment text",
                    "words": [...]
                }
            ]
        }

        Args:
            whisper_response: Raw response from Whisper API

        Returns:
            Normalized transcript structure
        """
        # Extract full text
        content = whisper_response.get("text", "")

        # Extract segments
        segments = []
        whisper_segments = whisper_response.get("segments", [])

        for seg in whisper_segments:
            segment_text = seg.get("text", "").strip()
            if not segment_text:
                continue

            # Get speaker info if available (Whisper doesn't provide speaker diarization by default)
            # We can use word-level data if needed
            words = seg.get("words", [])

            segments.append({
                "id": f"seg_{seg.get('id', len(segments))}",
                "text": segment_text,
                "start_time": seg.get("start", 0.0),
                "end_time": seg.get("end", 0.0),
                "speaker": "Unknown",  # Whisper doesn't provide speaker diarization
                "speaker_id": "unknown",
            })

        # Get duration
        duration_seconds = whisper_response.get("duration")
        if duration_seconds:
            duration_seconds = int(duration_seconds)

        return {
            "content": content,
            "segments": segments,
            "duration_seconds": duration_seconds,
            "raw_response": whisper_response,
        }


# Singleton instance
_whisper_client: WhisperAPIClient | None = None


def get_whisper_client() -> WhisperAPIClient:
    """Get or create Whisper API client instance."""
    global _whisper_client
    if _whisper_client is None:
        _whisper_client = WhisperAPIClient()
    return _whisper_client

