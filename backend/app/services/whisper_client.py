"""OpenAI Whisper API client for Cantonese-English mixed transcription.

Whisper supports multilingual code-switching natively, making it ideal
for Cantonese-English mixed audio transcription.

Note: Whisper API has a 25MB file size limit. Files exceeding 24MB are
automatically split into chunks, transcribed separately, and merged.
"""

import logging
import ssl
import tempfile
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Whisper API limit: 25MB. Use 24MB threshold to leave margin.
WHISPER_MAX_FILE_BYTES = 24 * 1024 * 1024
# Chunk duration in seconds (~10 min yields ~15MB for typical m4a)
CHUNK_DURATION_MS = 10 * 60 * 1000

# Map Whisper response language (e.g. "chinese") to ISO-639-1 for API input
LANGUAGE_TO_ISO6391: dict[str, str] = {
    "chinese": "zh",
    "mandarin": "zh",
    "zh-cn": "zh",
    "zh-tw": "zh",
    "cantonense": "yue",
    "cantonese": "yue",
    "english": "en",
    "japanese": "ja",
    "korean": "ko",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "portuguese": "pt",
    "russian": "ru",
}


def _normalize_language_for_api(lang: str | None) -> str | None:
    """Convert Whisper response language to ISO-639-1 for API parameter."""
    if not lang:
        return None
    lower = lang.lower().strip()
    if len(lower) == 2:  # Already ISO-639-1
        return lower
    return LANGUAGE_TO_ISO6391.get(lower, lower)


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
            # Long timeouts for Whisper: processing can take ~1-2 min per minute of audio.
            # Default 3600s (1h) for read/write/pool; connect 60s.
            http_client = httpx.Client(
                timeout=httpx.Timeout(3600.0, connect=60.0),
                verify=ssl_context,  # Use SSL context with certifi certificates
                limits=httpx.Limits(max_keepalive_connections=0),  # Disable keep-alive to avoid stale connections on long requests
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

    def _transcribe_single(
        self,
        audio_file_path: Path | str,
        language: str | None,
        task: str,
    ) -> dict[str, Any]:
        """Transcribe a single audio file (must be under 25MB)."""
        path = Path(audio_file_path)
        with open(path, "rb") as audio_file:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                response_format="verbose_json",
                timestamp_granularities=["segment", "word"],
            )
        return transcript.model_dump()

    def _transcribe_chunked(
        self,
        audio_file_path: Path,
        language: str | None,
        task: str,
    ) -> dict[str, Any]:
        """Split large audio into chunks, transcribe each, merge results."""
        try:
            from pydub import AudioSegment
        except ImportError:
            raise WhisperClientError(
                "pydub is required for files > 25MB. Install with: pip install pydub. "
                "Also ensure ffmpeg is installed (brew install ffmpeg on macOS)."
            ) from None

        logger.info(f"📂 File exceeds 24MB, splitting into chunks...")
        audio = AudioSegment.from_file(str(audio_file_path))
        total_ms = len(audio)
        total_sec = total_ms / 1000.0

        chunks: list[tuple[int, int]] = []  # (start_ms, end_ms)
        start = 0
        while start < total_ms:
            end = min(start + CHUNK_DURATION_MS, total_ms)
            chunks.append((start, end))
            start = end

        logger.info(f"   Created {len(chunks)} chunks (~10 min each)")

        merged_text_parts: list[str] = []
        merged_segments: list[dict[str, Any]] = []
        segment_id = 0
        detected_language: str | None = language

        with tempfile.TemporaryDirectory() as tmpdir:
            for i, (chunk_start_ms, chunk_end_ms) in enumerate(chunks):
                chunk_audio = audio[chunk_start_ms:chunk_end_ms]
                chunk_path = Path(tmpdir) / f"chunk_{i}.mp3"
                chunk_audio.export(str(chunk_path), format="mp3", bitrate="128k")

                logger.info(f"   Transcribing chunk {i + 1}/{len(chunks)}...")
                chunk_result = self._transcribe_single(chunk_path, detected_language, task)

                text = chunk_result.get("text", "").strip()
                if text:
                    merged_text_parts.append(text)

                # Use language from first chunk for subsequent chunks
                # Normalize to ISO-639-1 (Whisper returns "chinese" but API expects "zh")
                if detected_language is None and chunk_result.get("language"):
                    detected_language = _normalize_language_for_api(chunk_result["language"])

                # Merge segments with time offset
                offset_sec = chunk_start_ms / 1000.0
                for seg in chunk_result.get("segments", []):
                    seg_text = seg.get("text", "").strip()
                    if not seg_text:
                        continue
                    # Adjust word-level timestamps by offset
                    words = seg.get("words", [])
                    adjusted_words = []
                    for w in words:
                        adj = dict(w) if isinstance(w, dict) else {}
                        if "start" in adj:
                            adj["start"] = adj["start"] + offset_sec
                        if "end" in adj:
                            adj["end"] = adj["end"] + offset_sec
                        adjusted_words.append(adj)
                    merged_segments.append({
                        "id": segment_id,
                        "seek": int(offset_sec),
                        "start": seg.get("start", 0) + offset_sec,
                        "end": seg.get("end", 0) + offset_sec,
                        "text": seg_text,
                        "words": adjusted_words,
                    })
                    segment_id += 1

        return {
            "text": " ".join(merged_text_parts),
            "language": detected_language,
            "duration": total_sec,
            "segments": merged_segments,
        }

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

        Files larger than 25MB are automatically split into chunks,
        transcribed separately, and merged.

        Args:
            audio_file_path: Path to the audio file to transcribe
            language: Language code (default: "yue" for Cantonese, None for auto-detect)
            task: "transcribe" (keep original language) or "translate" (to English)

        Returns:
            Transcription result with text and segments

        Raises:
            WhisperClientError: If transcription fails
        """
        audio_file_path = Path(audio_file_path)
        if not audio_file_path.exists():
            raise WhisperClientError(f"Audio file not found: {audio_file_path}")

        file_size = audio_file_path.stat().st_size
        logger.info(f"📤 Transcribing with Whisper API: {audio_file_path.name}")
        logger.info(f"   File size: {file_size / (1024*1024):.2f} MB")
        logger.info(f"   Language: {language or 'auto-detect'}, Task: {task}")

        try:
            if file_size <= WHISPER_MAX_FILE_BYTES:
                result = self._transcribe_single(audio_file_path, language, task)
            else:
                result = self._transcribe_chunked(audio_file_path, language, task)

            logger.info(f"✅ Whisper transcription completed")
            logger.info(f"   Text length: {len(result.get('text', ''))} chars")

            return result

        except WhisperClientError:
            raise
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

