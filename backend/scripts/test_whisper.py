#!/usr/bin/env python3
"""Test script for Whisper API - diagnose connection, API key, and transcription.

Run from backend directory (so .env is loaded):
    cd backend

Usage:
    # Check config, connectivity, and auth only
    python scripts/test_whisper.py

    # Full transcription test (requires audio file)
    python scripts/test_whisper.py <audio_file_path>

Examples:
    python scripts/test_whisper.py
    python scripts/test_whisper.py ../tests/test.m4a
"""

import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))


def check_config() -> bool:
    """Check API key and config. Returns True if OK."""
    from app.core.config import settings

    print("=" * 60)
    print("1. Configuration Check")
    print("=" * 60)
    print(f"   ASR Provider: {settings.asr_provider}")
    if not settings.openai_api_key:
        print("   ❌ OPENAI_API_KEY is not set!")
        print("   Set it in backend/.env: OPENAI_API_KEY=sk-...")
        return False
    key_preview = settings.openai_api_key[:8] + "..." + settings.openai_api_key[-4:]
    print(f"   API Key: {key_preview}")
    print("   ✅ Configuration OK")
    return True


def check_connectivity() -> bool:
    """Test connectivity to OpenAI API. Returns True if reachable."""
    import httpx

    from app.core.config import settings

    print()
    print("=" * 60)
    print("2. Network Connectivity Check")
    print("=" * 60)

    # OpenAI API endpoint (list models - lightweight)
    url = "https://api.openai.com/v1/models"
    print(f"   Testing: GET {url}")

    try:
        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 401:
                print("   ⚠️  401 Unauthorized - API key invalid or expired")
                return False
            elif response.status_code == 200:
                print("   ✅ Network reachable, API key valid")
                return True
            else:
                print(f"   ⚠️  Unexpected status: {response.status_code}")
                return False
    except httpx.ConnectError as e:
        print(f"   ❌ Connection failed: {e}")
        print("   Possible causes: network unavailable, firewall, proxy needed")
        return False
    except httpx.TimeoutException as e:
        print(f"   ❌ Timeout: {e}")
        print("   Possible causes: slow network, firewall blocking")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def check_whisper_auth() -> bool:
    """Test Whisper API authentication with a minimal request."""
    print()
    print("=" * 60)
    print("3. Whisper API Auth Check")
    print("=" * 60)

    from app.core.config import settings

    # Create a tiny 1-second silent WAV (Whisper needs real audio format)
    import io
    import struct

    # Minimal WAV: 1 second, 16kHz, mono, 16-bit
    sample_rate = 16000
    duration = 1
    num_samples = sample_rate * duration
    wav_buffer = io.BytesIO()
    # WAV header
    wav_buffer.write(b"RIFF")
    wav_buffer.write(struct.pack("<I", 36 + num_samples * 2))  # file size - 8
    wav_buffer.write(b"WAVE")
    wav_buffer.write(b"fmt ")
    wav_buffer.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    wav_buffer.write(b"data")
    wav_buffer.write(struct.pack("<I", num_samples * 2))
    # Silent samples
    for _ in range(num_samples):
        wav_buffer.write(struct.pack("<h", 0))
    wav_buffer.seek(0)

    try:
        import httpx
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        # Use default timeout for this quick test
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=("test.wav", wav_buffer.read(), "audio/wav"),
        )
        print(f"   ✅ Whisper API OK - got response ({len(result.text or '')} chars)")
        return True
    except Exception as e:
        err = str(e)
        print(f"   ❌ Whisper API error: {err}")
        if "401" in err or "Incorrect API key" in err or "invalid_api_key" in err:
            print("   → API key is invalid or expired. Check OPENAI_API_KEY.")
        elif "Connection" in err or "connect" in err.lower():
            print("   → Network/connection issue. Try proxy or check firewall.")
        elif "timeout" in err.lower():
            print("   → Request timed out. Network may be slow or blocked.")
        return False


def run_transcription(audio_path: Path) -> bool:
    """Run full transcription test. Returns True if success."""
    print()
    print("=" * 60)
    print("4. Full Transcription Test")
    print("=" * 60)
    print(f"   File: {audio_path}")
    print(f"   Size: {audio_path.stat().st_size / 1024:.1f} KB")

    try:
        from app.services.whisper_client import get_whisper_client, WhisperClientError

        client = get_whisper_client()
        print("   Transcribing... (may take 1-2 min per minute of audio)")
        result = client.transcribe(audio_path, language=None, task="transcribe")
        normalized = client.normalize_transcript(result)

        print()
        print("   ✅ Transcription succeeded!")
        print(f"   Content length: {len(normalized['content'])} chars")
        print(f"   Segments: {len(normalized.get('segments', []))}")
        if normalized["content"]:
            preview = normalized["content"][:200] + "..." if len(normalized["content"]) > 200 else normalized["content"]
            print(f"   Preview: {preview}")
        return True
    except WhisperClientError as e:
        print(f"   ❌ {e}")
        return False
    except Exception as e:
        print(f"   ❌ {e}")
        return False


def main() -> None:
    """Run diagnostics."""
    print()
    print("Whisper API Diagnostic Script")
    print("=" * 60)

    if not check_config():
        sys.exit(1)

    # Step 2: connectivity (uses httpx directly, no API key in header for models list - actually it needs auth)
    # Let me fix - GET /v1/models does require Authorization. So we'll get 401 if key is wrong.
    # Actually for models list we need Bearer token. So it tests both network AND auth.
    if not check_connectivity():
        print()
        print("Tip: If in China, you may need HTTP_PROXY/HTTPS_PROXY for OpenAI.")
        sys.exit(1)

    # Step 3: quick Whisper auth test with minimal audio
    if not check_whisper_auth():
        sys.exit(1)

    # Step 4: full transcription if audio file provided
    if len(sys.argv) >= 2:
        audio_path = Path(sys.argv[1])
        if not audio_path.exists():
            print(f"\nError: Audio file not found: {audio_path}")
            sys.exit(1)
        if not run_transcription(audio_path):
            sys.exit(1)
    else:
        print()
        print("No audio file provided. To test full transcription:")
        print("  python scripts/test_whisper.py <path/to/audio.m4a>")

    print()
    print("=" * 60)
    print("✅ All checks passed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
