#!/usr/bin/env python3
"""Check Dify API response format - verify if output is Markdown or plain text.

Run from backend directory:
    cd backend
    python scripts/check_dify_output_format.py

Uses a minimal sample transcript to trigger Dify and inspect the raw response.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# Sample transcript (short, to avoid long processing)
SAMPLE_TRANSCRIPT = """
张三：大家好，今天我们讨论一下项目进度。
李四：好的，我先汇报一下上周完成的工作。
张三：请说。
李四：我们完成了需求评审，下周开始开发。
"""


def has_markdown_patterns(text: str) -> dict:
    """Check for common Markdown syntax in text."""
    patterns = {
        "headers_h1": bool(re.search(r"^#\s+.+", text, re.MULTILINE)),
        "headers_h2": bool(re.search(r"^##\s+.+", text, re.MULTILINE)),
        "headers_h3": bool(re.search(r"^###\s+.+", text, re.MULTILINE)),
        "bold": "**" in text or "__" in text,
        "bullet_list": bool(re.search(r"^[\-\*]\s+.+", text, re.MULTILINE)),
        "numbered_list": bool(re.search(r"^\d+\.\s+.+", text, re.MULTILINE)),
        "links": bool(re.search(r"\[.+\]\(.+\)", text)),
        "code_inline": "`" in text,
        "code_block": "```" in text,
        "horizontal_rule": "---" in text or "***" in text,
    }
    return patterns


def main() -> None:
    from app.core.config import settings

    if settings.summarization_provider != "dify":
        print("⚠️  SUMMARIZATION_PROVIDER is not 'dify'. Set it in .env to test.")
        sys.exit(1)

    if not settings.dify_api_key:
        print("❌ DIFY_API_KEY is not set.")
        sys.exit(1)

    print("=" * 60)
    print("Dify Output Format Check")
    print("=" * 60)
    print(f"API Base: {settings.dify_api_base_url}")
    print()

    try:
        from app.services.dify_client import DifyClient, DifyClientError

        client = DifyClient()
        print("Calling Dify with sample transcript...")
        answer = client.send_chat_message(
            query=SAMPLE_TRANSCRIPT.strip(),
            user="format-check-script",
            response_mode="blocking",
        )

        print()
        print("=" * 60)
        print("Raw Response (first 1500 chars)")
        print("=" * 60)
        preview = answer[:1500] + ("..." if len(answer) > 1500 else "")
        print(preview)
        print()

        print("=" * 60)
        print("Markdown Pattern Detection")
        print("=" * 60)
        patterns = has_markdown_patterns(answer)
        for name, found in patterns.items():
            status = "✅" if found else "❌"
            print(f"  {status} {name}: {found}")

        has_any = any(patterns.values())
        print()
        if has_any:
            print("Conclusion: Response appears to contain Markdown syntax.")
            print("Frontend ReactMarkdown should render it correctly.")
        else:
            print("Conclusion: No Markdown patterns detected.")
            print("Dify may be returning plain text. Options:")
            print("  1. Configure Dify prompt to request Markdown output (e.g. # ## - **)")
            print("  2. Or render as plain text with newlines preserved (white-space: pre-wrap)")

        print()
        print("=" * 60)
        print("Full response length:", len(answer), "chars")
        print("=" * 60)

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
