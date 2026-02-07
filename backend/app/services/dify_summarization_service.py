"""Dify Chatflow-based summarization service for meeting minutes.

Sends transcript content to Dify Chatflow and receives markdown-formatted
meeting minutes. Output is plain text (no structured JSON).
"""

import logging
from typing import Any

from app.services.dify_client import DifyClient, DifyClientError

from .summarization_service import SummarizationError

logger = logging.getLogger(__name__)


class DifySummarizationService:
    """Service for generating meeting minutes via Dify Chatflow."""

    def __init__(self) -> None:
        """Initialize Dify summarization service."""
        self.dify_client = DifyClient()
        logger.info("✅ Dify summarization service initialized")

    def generate_summary(
        self,
        transcript_text: str,
        meeting_title: str | None = None,
        template: str | None = None,
        language: str = "yue",
        prompt_template_content: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        """
        Generate meeting minutes from transcript via Dify Chatflow.

        Sends only transcript content to Dify. Output is plain text (markdown).
        prompt_template_content is accepted for interface compatibility but not used.

        Args:
            transcript_text: Full transcript content (from transcripts.content)
            meeting_title: Meeting title (optional, not passed to Dify)
            template: Template name (optional, not passed to Dify)
            language: Language code (optional, not passed to Dify)
            prompt_template_content: Not used (kept for interface compatibility)
            model: Not used (Dify uses its own model config)

        Returns:
            Summary dict with overview="", detailed_minutes=<markdown>, agenda_items=[],
            decisions=[], highlights=[], action_items=[]
        """
        logger.info(f"📝 Generating meeting minutes via Dify for: {meeting_title or 'Untitled'}")
        logger.info(f"   Transcript length: {len(transcript_text)} chars")

        # Truncate if too long (avoid token limits)
        max_length = 100_000
        if len(transcript_text) > max_length:
            logger.warning(
                f"Transcript is very long ({len(transcript_text)} chars). Truncating to {max_length} chars."
            )
            transcript_text = transcript_text[:max_length] + "\n\n[... transcript truncated ...]"

        # Use meeting_title or a generic id for user field (Dify requires unique user per request)
        user_id = f"meeting-{meeting_title or 'untitled'}"[:64].replace(" ", "-")

        try:
            answer = self.dify_client.send_chat_message(
                query=transcript_text,
                user=user_id,
                response_mode="blocking",
            )
        except DifyClientError as e:
            raise SummarizationError(f"Dify summarization failed: {e}") from e

        if not answer:
            raise SummarizationError("Empty response from Dify")

        logger.info("✅ Dify meeting minutes generated successfully")
        logger.info(f"   Output length: {len(answer)} chars")

        return {
            "overview": "",
            "detailed_minutes": answer,
            "agenda_items": [],
            "decisions": [],
            "highlights": [],
            "action_items": [],
        }
