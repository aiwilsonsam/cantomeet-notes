"""LLM summarization service for generating structured meeting summaries.

This service uses OpenAI's GPT models to generate structured summaries from
Cantonese-English mixed meeting transcripts.
"""

import json
import logging
from typing import Any, Union


from app.core.config import settings

logger = logging.getLogger(__name__)


class SummarizationError(Exception):
    """Base exception for summarization errors."""


class SummarizationService:
    """Service for generating structured meeting summaries using LLM."""

    def __init__(self) -> None:
        """Initialize summarization service."""
        if not settings.openai_api_key:
            raise SummarizationError(
                "OPENAI_API_KEY is not configured. Set it in environment variables."
            )

        try:
            from openai import OpenAI
            import certifi
            import httpx
            import os
            import ssl

            # Fix SSL certificate issues (same as Whisper client)
            cert_path = certifi.where()
            os.environ.setdefault("REQUESTS_CA_BUNDLE", cert_path)
            os.environ.setdefault("SSL_CERT_FILE", cert_path)
            os.environ.setdefault("CURL_CA_BUNDLE", cert_path)

            ssl_context = ssl.create_default_context(cafile=cert_path)

            http_client = httpx.Client(
                timeout=httpx.Timeout(300.0, connect=30.0),
                verify=ssl_context,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            )

            self.client = OpenAI(
                api_key=settings.openai_api_key,
                http_client=http_client,
            )
            self.default_model = settings.summarization_default_model
            logger.info("✅ Summarization service initialized")
            logger.info(f"   Default model: {self.default_model}")
        except ImportError as e:
            missing_package = "openai" if "openai" in str(e) else "certifi"
            raise SummarizationError(
                f"{missing_package} package is not installed. Install it with: pip install openai certifi"
            )

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
        Generate meeting summary from transcript.

        When prompt_template_content is provided (PROMPT template mode):
        - Uses the template with {{content}} replaced by transcript
        - LLM output is free-form text, stored in detailed_minutes
        - Returns overview="", detailed_minutes=<raw output>, decisions=[], action_items=[]

        Otherwise (SECTIONS template mode):
        - Uses structured JSON output with overview, detailed_minutes, decisions, action_items

        Args:
            transcript_text: Full transcript text
            meeting_title: Meeting title (optional)
            template: Template name for SECTIONS mode (default, Product Review, Sales)
            language: Language code (default "yue")
            prompt_template_content: Prompt template content with {{content}} for PROMPT mode
            model: Override LLM model (e.g. gpt-4o, gpt-4o-mini); uses workspace default or config default if None

        Returns:
            Summary dict with overview, detailed_minutes, agenda_items, decisions, highlights, action_items
        """
        logger.info(f"📝 Generating summary for meeting: {meeting_title or 'Untitled'}")
        logger.info(f"   Transcript length: {len(transcript_text)} chars")

        effective_model = model or self.default_model
        logger.info(f"   Model: {effective_model}")

        if prompt_template_content:
            return self._generate_with_prompt_template(
                transcript_text, prompt_template_content, effective_model
            )
        return self._generate_with_sections_template(
            transcript_text, meeting_title, template, language, effective_model
        )

    def _generate_with_prompt_template(
        self, transcript_text: str, prompt_template_content: str, model: str
    ) -> dict[str, Any]:
        """Generate free-form summary using user prompt template."""
        logger.info("   Mode: PROMPT template (free-form output)")

        user_prompt = prompt_template_content.replace("{{content}}", transcript_text)

        max_transcript_length = 100000
        if len(transcript_text) > max_transcript_length:
            logger.warning(
                f"Transcript is very long ({len(transcript_text)} chars). Truncating to {max_transcript_length} chars."
            )
            truncated = transcript_text[:max_transcript_length] + "\n\n[... transcript truncated ...]"
            user_prompt = prompt_template_content.replace("{{content}}", truncated)

        system_prompt = "你是一个会议纪要助手。请根据用户的指示处理转录内容，并按要求生成输出。输出格式完全由用户指示决定。"

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                # No response_format - free-form text output
            )

            content = response.choices[0].message.content
            if not content:
                raise SummarizationError("Empty response from LLM")

            logger.info("✅ PROMPT template summary generated successfully")
            logger.info(f"   Output length: {len(content)} chars")

            return {
                "overview": "",
                "detailed_minutes": content,
                "agenda_items": [],
                "decisions": [],
                "highlights": [],
                "action_items": [],
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ PROMPT template summarization error: {error_msg}")
            raise SummarizationError(f"Failed to generate summary: {error_msg}") from e

    def _generate_with_sections_template(
        self,
        transcript_text: str,
        meeting_title: str | None,
        template: str | None,
        language: str,
        model: str,
    ) -> dict[str, Any]:
        """Generate structured JSON summary using SECTIONS template."""
        logger.info(f"   Mode: SECTIONS template ({template or 'default'})")

        system_prompt = self._build_system_prompt(template)
        user_prompt = self._build_user_prompt(transcript_text, meeting_title, language)

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                raise SummarizationError("Empty response from LLM")

            try:
                summary_data = json.loads(content)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM JSON response: {e}")
                logger.error(f"Response content: {content[:500]}")
                raise SummarizationError(f"Invalid JSON response from LLM: {e}") from e

            logger.info("✅ SECTIONS summary generated successfully")
            logger.info(f"   Overview length: {len(summary_data.get('overview', ''))} chars")
            detailed_minutes_len = len(summary_data.get('detailed_minutes', '') or '')
            logger.info(f"   Detailed minutes length: {detailed_minutes_len} chars")
            logger.info(f"   Decisions: {len(summary_data.get('decisions', []))}")
            logger.info(f"   Action items: {len(summary_data.get('action_items', []))}")

            return summary_data

        except SummarizationError:
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Summarization error: {error_msg}")
            raise SummarizationError(f"Failed to generate summary: {error_msg}") from e

    def _build_system_prompt(self, template: str | None = None) -> str:
        """
        Build system prompt for LLM based on template.

        Args:
            template: Template name (optional)

        Returns:
            System prompt string
        """
        base_prompt = """You are an expert meeting notes assistant specializing in Hong Kong business meetings. 
You analyze meeting transcripts that contain mixed Cantonese (粤语) and English content, which is common in Hong Kong business environments.

Your task is to generate TWO types of summaries:

1. **Overview (overview)**: A concise executive summary (2-3 paragraphs) for quick reference
2. **Detailed Minutes (detailed_minutes)**: A comprehensive, structured meeting minutes (会议纪要) in Markdown format that can be directly reported to management. Output style should match ChatGPT's meeting minutes: clear sections, proper spacing, tables for action items where appropriate.

Generate a structured JSON summary with the following format:
{
  "overview": "A concise executive summary (2-3 paragraphs) of what the meeting was about, key topics discussed, and main outcomes. Use the same language mix as the transcript (Cantonese-English). Keep it brief and focused.",
  "detailed_minutes": "Professional meeting minutes in Markdown format. Follow ChatGPT-style structure:\n\n📝会议纪要：[Meeting Title]\n\n**时间**： infer from context or write \"未提供\" (NEVER use [时间] or [日期] placeholders)\n**地点**： infer or \"未提供\"\n**与会人员**： list names from transcript\n**会议主题**： brief theme\n\n# 1. [Topic 1 Title]\n\n- Key point with specific details (preserve technical terms: HKMA, HSM, KYT, etc.)\n- Next point\n\n# 2. [Topic 2 Title]\n\n...\n\n# 行动项与后续计划\n\n| 行动项 | 负责人 | 备注 |\n| --- | --- | --- |\n| [task] | [owner] | [notes] |\n\n**CRITICAL FORMATTING RULES:**\n- NEVER use placeholder text like [日期], [地点], [时间]. Use \"未提供\" or \"待定\" if unknown.\n- Preserve all technical terms, company names, numbers (e.g. HKMA, HSM, Elliptic, 5台/10台).\n- Allow blank lines between major sections for readability (same as ChatGPT).\n- Action items: use Markdown table format (| 行动项 | 负责人 | 备注 |) when there are multiple items.\n- Use ** (bold) for emphasis in content, not in # headers.\n- Include emoji like 📝 if it fits the style.\n- Be detailed and professional - do not over-compress. Capture key decisions, numbers, and next steps.",
  "agenda_items": [
    {
      "id": "agenda_1",
      "title": "Agenda item title",
      "description": "Brief description"
    }
  ],
  "decisions": [
    {
      "id": "dec_1",
      "description": "Clear description of the decision made, including who made it and what was decided. Format as professional meeting minutes style.",
      "relatedSegmentId": "seg_0"
    }
  ],
  "highlights": [
    {
      "id": "highlight_1",
      "text": "Important point or insight",
      "category": "technical" | "business" | "action" | "risk"
    }
  ],
  "action_items": [
    {
      "id": "act_1",
      "description": "Clear, actionable task description",
      "owner": "Person name (extract from transcript if mentioned, otherwise use 'TBD')",
      "dueDate": "YYYY-MM-DD" or null if not specified,
      "priority": "high" | "medium" | "low",
      "relatedSegmentId": "seg_0"
    }
  ]
}

IMPORTANT GUIDELINES:
1. **ChatGPT-Style Format**: Match ChatGPT's meeting minutes output:
   - Clear numbered sections with # 1. # 2. etc.
   - Blank lines between major sections for readability
   - Action items in Markdown table: | 行动项 | 负责人 | 备注 |
   - Preserve technical terms (HKMA, HSM, KYT, Elliptic, Chainalysis, etc.)

2. **Placeholders**: NEVER output [日期], [地点], [时间]. Use "未提供" or "待定" if not in transcript.

3. **Content**: Include meeting topic, date, attendees, discussion topics with details, technical decisions, action items table.

4. **Language**: Preserve Cantonese-English mix from transcript.

5. **Accuracy**: Be precise. Preserve specific numbers, company names, and decisions.

6. **Action Items** (in JSON): Extract owner, dueDate if mentioned. For detailed_minutes, use table format.
"""

        # Template-specific customizations (can be extended)
        if template == "Product Review":
            template_specific = """
ADDITIONAL GUIDELINES FOR PRODUCT REVIEW TEMPLATE:
- Focus on product features, user feedback, and technical decisions
- Highlight technical risks and dependencies
- Emphasize product roadmap and timeline decisions
"""
            return base_prompt + template_specific
        elif template == "Sales":
            template_specific = """
ADDITIONAL GUIDELINES FOR SALES TEMPLATE:
- Focus on customer needs, objections, and next steps
- Highlight deal status and pipeline updates
- Emphasize follow-up actions and commitments
"""
            return base_prompt + template_specific
        else:
            return base_prompt

    def _build_user_prompt(
        self, transcript_text: str, meeting_title: str | None = None, language: str = "yue"
    ) -> str:
        """
        Build user prompt with transcript content.

        Args:
            transcript_text: Full transcript text
            meeting_title: Meeting title (optional)
            language: Language code

        Returns:
            User prompt string
        """
        prompt_parts = []

        if meeting_title:
            prompt_parts.append(f"Meeting Title: {meeting_title}")

        prompt_parts.append(f"Language: {language} (Cantonese with English code-switching)")

        prompt_parts.append("请根据以下会议转录内容，生成两种格式的摘要：")
        prompt_parts.append("1. **overview**: 简短的执行摘要（2-3段）")
        prompt_parts.append("2. **detailed_minutes**: 生成一份专业会议纪要，风格参考 ChatGPT 输出：")
        prompt_parts.append("   - 按主题分章节，章节之间可留空行便于阅读")
        prompt_parts.append("   - 若无日期/地点则写「未提供」或「待定」，切勿使用 [日期] [地点] 等占位符")
        prompt_parts.append("   - 保留所有技术术语、公司名称、具体数字")
        prompt_parts.append("   - 行动项使用 Markdown 表格：| 行动项 | 负责人 | 备注 |")
        prompt_parts.append("- 必须生成 detailed_minutes（除非转录明显不是会议）")
        prompt_parts.append("- 按系统提示词格式输出 JSON")

        # Truncate transcript if too long (to avoid token limits)
        # GPT-4o-mini has ~128k context, but we'll be conservative
        max_transcript_length = 100000  # ~100k chars
        if len(transcript_text) > max_transcript_length:
            logger.warning(
                f"Transcript is very long ({len(transcript_text)} chars). Truncating to {max_transcript_length} chars."
            )
            transcript_text = transcript_text[:max_transcript_length] + "\n\n[... transcript truncated ...]"

        prompt_parts.append("\n--- 会议转录内容 TRANSCRIPT ---")
        prompt_parts.append(transcript_text)
        prompt_parts.append("--- 转录内容结束 END TRANSCRIPT ---")

        prompt_parts.append(
            "\n请按照系统提示词中指定的格式，生成结构化的 JSON 会议纪要。"
        )

        return "\n".join(prompt_parts)


# Singleton instances (one per provider)
_openai_summarization_service: SummarizationService | None = None
_dify_summarization_service: "DifySummarizationService | None" = None


def get_summarization_service() -> Union[SummarizationService, "DifySummarizationService"]:
    """Get summarization service based on SUMMARIZATION_PROVIDER setting."""
    from app.core.config import settings

    if settings.summarization_provider == "dify":
        global _dify_summarization_service
        if _dify_summarization_service is None:
            from app.services.dify_summarization_service import DifySummarizationService

            _dify_summarization_service = DifySummarizationService()
        return _dify_summarization_service

    global _openai_summarization_service
    if _openai_summarization_service is None:
        _openai_summarization_service = SummarizationService()
    return _openai_summarization_service

