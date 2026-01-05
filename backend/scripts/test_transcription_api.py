#!/usr/bin/env python3
"""Test script for transcription API.

Usage:
    python scripts/test_transcription_api.py <email> <password> <file_path> [language]

Example:
    python scripts/test_transcription_api.py user@example.com password123 test.m4a yue
"""

import requests
import sys
import os

API_BASE_URL = "http://localhost:8000/api"


def login(email: str, password: str) -> str:
    """Login and return token."""
    url = f"{API_BASE_URL}/auth/login"
    data = {"email": email, "password": password}

    print(f"🔐 Logging in as {email}...")
    response = requests.post(url, json=data)

    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        sys.exit(1)

    token = response.json()["token"]
    print(f"✅ Login successful!")
    return token


def test_transcription(file_path: str, token: str, language: str = "yue"):
    """Test transcription API."""
    url = f"{API_BASE_URL}/transcription/test"
    headers = {"Authorization": f"Bearer {token}"}

    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)

    print(f"📤 Uploading {file_path}...")
    with open(file_path, "rb") as f:
        files = {"file": f}
        data = {"language": language}

        print("🔄 Transcribing (this may take a while)...")
        response = requests.post(url, headers=headers, files=files, data=data)

        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Transcription successful!")
            print(f"Content length: {len(result['content'])} chars")
            print(f"Segments: {len(result['segments'])}")
            print(f"Duration: {result['duration_seconds']} seconds")
            print(f"Language: {result['language']}")
            print(f"Job ID: {result['job_id']}")
            print(f"\n📝 First 500 chars of transcript:")
            print("-" * 50)
            print(result["content"][:500])
            print("-" * 50)

            # Save full transcript to file
            output_file = f"{file_path}.transcript.txt"
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(result["content"])
            print(f"\n💾 Full transcript saved to: {output_file}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python test_transcription_api.py <email> <password> <file_path> [language]")
        print("Example: python test_transcription_api.py user@example.com password123 test.m4a yue")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]
    file_path = sys.argv[3]
    language = sys.argv[4] if len(sys.argv) > 4 else "yue"

    # Login and get token
    token = login(email, password)

    # Test transcription
    test_transcription(file_path, token, language)

