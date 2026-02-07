"""Dify Chatflow API client for meeting minutes generation."""

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class DifyClientError(Exception):
    """Base exception for Dify client errors."""


class DifyClient:
    """Client for Dify Chatflow API (chat-messages endpoint)."""

    def __init__(self) -> None:
        """Initialize Dify client."""
        if not settings.dify_api_key:
            raise DifyClientError(
                "DIFY_API_KEY is not configured. Set it in environment variables when using Dify for summarization."
            )
        self.api_key = settings.dify_api_key
        base = settings.dify_api_base_url.rstrip("/")
        self.chat_url = f"{base}/chat-messages"
        logger.info("✅ Dify client initialized")
        logger.info(f"   Base URL: {base}")

    def send_chat_message(
        self,
        query: str,
        user: str = "cantomeet-user",
        response_mode: str = "blocking",
    ) -> str:
        """
        Send a chat message to Dify Chatflow and get the answer.

        Args:
            query: User input (transcript content for meeting minutes)
            user: User identifier (unique per request/caller)
            response_mode: "blocking" or "streaming" (blocking recommended for server-side)

        Returns:
            The answer text from Dify
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": {},
            "query": query,
            "user": user,
            "response_mode": response_mode,
        }

        try:
            with httpx.Client(timeout=300.0) as client:
                response = client.post(
                    self.chat_url,
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data: dict[str, Any] = response.json()

            answer = data.get("answer")
            if answer is None:
                raise DifyClientError(
                    f"Dify response missing 'answer' field: {list(data.keys())}"
                )
            return str(answer).strip()

        except httpx.HTTPStatusError as e:
            body = e.response.text
            logger.error(f"Dify API HTTP error {e.response.status_code}: {body}")
            raise DifyClientError(
                f"Dify API error: {e.response.status_code} - {body[:500]}"
            ) from e
        except httpx.RequestError as e:
            logger.error(f"Dify API request error: {e}")
            raise DifyClientError(f"Dify API request failed: {e}") from e
