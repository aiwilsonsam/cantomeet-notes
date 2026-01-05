#!/usr/bin/env python3
"""Check current ASR provider configuration."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings

def main():
    """Check and display ASR configuration."""
    print("=" * 60)
    print("ASR Provider Configuration Check")
    print("=" * 60)
    print()
    
    # Check ASR provider
    print(f"📌 ASR Provider: {settings.asr_provider}")
    print()
    
    # Check provider-specific configurations
    if settings.asr_provider == "whisper":
        print("✅ Using Whisper API")
        print(f"   OpenAI API Key configured: {'Yes' if settings.openai_api_key else '❌ No'}")
        if settings.openai_api_key:
            # Show first and last few characters for security
            key_preview = settings.openai_api_key[:8] + "..." + settings.openai_api_key[-4:]
            print(f"   API Key preview: {key_preview}")
        else:
            print("   ⚠️  Warning: OPENAI_API_KEY is not set!")
            print("   Please set it in .env file:")
            print("   OPENAI_API_KEY=your_key_here")
    else:
        print("✅ Using Speechmatics API")
        print(f"   Speechmatics API Key configured: {'Yes' if settings.speechmatics_api_key else '❌ No'}")
        if settings.speechmatics_api_key:
            key_preview = settings.speechmatics_api_key[:8] + "..." + settings.speechmatics_api_key[-4:]
            print(f"   API Key preview: {key_preview}")
        else:
            print("   ⚠️  Warning: SPEECHMATICS_API_KEY is not set!")
        print(f"   Base URL: {settings.speechmatics_base_url or 'Default (https://asr.api.speechmatics.com)'}")
    
    print()
    print("=" * 60)
    
    # Check if configuration is valid
    if settings.asr_provider == "whisper" and not settings.openai_api_key:
        print("❌ Configuration Error: Whisper is selected but OPENAI_API_KEY is not set!")
        sys.exit(1)
    elif settings.asr_provider == "speechmatics" and not settings.speechmatics_api_key:
        print("❌ Configuration Error: Speechmatics is selected but SPEECHMATICS_API_KEY is not set!")
        sys.exit(1)
    else:
        print("✅ Configuration looks good!")
        sys.exit(0)

if __name__ == "__main__":
    main()

