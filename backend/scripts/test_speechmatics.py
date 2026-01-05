#!/usr/bin/env python3
"""Test script for Speechmatics ASR integration.

Usage:
    python scripts/test_speechmatics.py <audio_file_path>

Example:
    python scripts/test_speechmatics.py ../test_audio.m4a
"""

import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.speechmatics_client import SpeechmaticsClient, SpeechmaticsClientError


def main() -> None:
    """Test Speechmatics transcription."""
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_speechmatics.py <audio_file_path>")
        sys.exit(1)

    audio_path = Path(sys.argv[1])
    if not audio_path.exists():
        print(f"Error: Audio file not found: {audio_path}")
        sys.exit(1)

    try:
        client = SpeechmaticsClient()
        print(f"Creating transcription job for: {audio_path}")
        
        # Create job
        job_result = client.create_transcription_job(audio_path, language="yue")
        job_id = job_result["job_id"]
        print(f"Job created: {job_id}")
        print(f"Status: {job_result['status']}")
        
        # Poll until complete
        print("\nPolling for completion...")
        transcript = client.poll_until_complete(job_id, max_wait_seconds=600)
        
        # Normalize and display
        normalized = client.normalize_transcript(transcript)
        print("\n=== Transcription Result ===")
        print(f"Content:\n{normalized['content']}")
        print(f"\nDuration: {normalized['duration_seconds']} seconds")
        print(f"Segments: {len(normalized['segments'])} words")
        
    except SpeechmaticsClientError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

