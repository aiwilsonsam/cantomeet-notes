"""LLM summarization service for generating structured meeting summaries.

This service uses OpenAI's GPT models to generate structured summaries from
Cantonese-English mixed meeting transcripts.
"""

import json
import logging
from typing import Any

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
            self.model = "gpt-4o-mini"  # Cost-effective model, can be changed to gpt-4o for better quality
            logger.info("✅ Summarization service initialized")
            logger.info(f"   Using model: {self.model}")
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
    ) -> dict[str, Any]:
        """
        Generate structured meeting summary from transcript.

        Args:
            transcript_text: Full transcript text (may contain Cantonese-English mixed content)
            meeting_title: Meeting title (optional, for context)
            template: Template name (optional, for custom formatting)
            language: Language code (default: "yue" for Cantonese)

        Returns:
            Structured summary dictionary with:
            - overview: Executive summary text
            - agenda_items: List of agenda items
            - decisions: List of key decisions
            - highlights: List of highlights
            - action_items: List of action items (extracted from decisions/discussions)

        Raises:
            SummarizationError: If summary generation fails
        """
        logger.info(f"📝 Generating summary for meeting: {meeting_title or 'Untitled'}")
        logger.info(f"   Transcript length: {len(transcript_text)} chars")
        logger.info(f"   Template: {template or 'default'}")

        # Build system prompt
        system_prompt = self._build_system_prompt(template)

        # Build user prompt with transcript
        user_prompt = self._build_user_prompt(transcript_text, meeting_title, language)

        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},  # Force JSON response
            )

            # Parse response
            content = response.choices[0].message.content
            if not content:
                raise SummarizationError("Empty response from LLM")

            # Parse JSON response
            try:
                summary_data = json.loads(content)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM JSON response: {e}")
                logger.error(f"Response content: {content[:500]}")
                raise SummarizationError(f"Invalid JSON response from LLM: {e}") from e

            logger.info("✅ Summary generated successfully")
            logger.info(f"   Overview length: {len(summary_data.get('overview', ''))} chars")
            detailed_minutes_len = len(summary_data.get('detailed_minutes', '') or '')
            logger.info(f"   Detailed minutes length: {detailed_minutes_len} chars")
            logger.info(f"   Decisions: {len(summary_data.get('decisions', []))}")
            logger.info(f"   Action items: {len(summary_data.get('action_items', []))}")

            return summary_data

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
2. **Detailed Minutes (detailed_minutes)**: A comprehensive, structured meeting minutes (会议纪要) that can be directly reported to management or project teams

Generate a structured JSON summary with the following format:
{
  "overview": "A concise executive summary (2-3 paragraphs) of what the meeting was about, key topics discussed, and main outcomes. Use the same language mix as the transcript (Cantonese-English). Keep it brief and focused.",
  "detailed_minutes": "A compact, professional meeting minutes in Markdown format. Use a concise structure similar to ChatGPT's output style. IMPORTANT: NO blank lines between sections - content should flow directly:\n\n# 会议纪要（Meeting Minutes）\n**会议主题：** [Meeting Topic]\n**会议日期：** [Date or '不详（根据对话推断为...）']\n**与会人员：**\n- [Participant 1]\n- [Participant 2]\n# 1. 会议目标（Objectives）\n1. [Objective 1 - concise, one line]\n2. [Objective 2 - concise, one line]\n# 2. [Main Discussion Topic 1]\n### 2.1 [Sub-topic]\n- [Key point 1 - concise bullet point]\n- [Key point 2 - concise bullet point]\n### 2.2 [Sub-topic]\n- [Key point - concise bullet point]\n# 3. [Main Discussion Topic 2]\n[Continue with structured sections - keep content concise and professional]\n# 4. 双方行动项（Action Items）\n### [Party 1] 需提供：\n1. [Action item 1 - concise]\n2. [Action item 2 - concise]\n### [Party 2] 将会：\n1. [Action item 1 - concise]\n2. [Action item 2 - concise]\n# 5. 后续计划（Next Steps）\n1. [Next step 1 - concise]\n2. [Next step 2 - concise]\n# 6. 会议结论（Summary）\n[Key conclusions - concise paragraph]\n\n**CRITICAL FORMATTING RULES:**\n- Use compact format: NO horizontal rules (------) between sections, **ABSOLUTELY NO blank lines** (\\n\\n) anywhere in the output\n- **DO NOT use ** (bold) in headers** - headers with # already indicate emphasis, so avoid # **Title** format, use # Title instead\n- Use ** (bold) only in regular text content, not in headers\n- **ZERO blank lines**: Do not include any empty lines. Sections should flow directly: \"# Section\\nContent\\n# Next Section\" (no \\n\\n between)\n- Keep each bullet point concise (one line when possible)\n- Remove redundant words and filler phrases\n- Use professional, direct language\n- Structure similar to ChatGPT's compact meeting minutes style\n- Only include essential information, remove verbose explanations\n- Format example: \"# Title\\nContent\\n# Next Title\\nMore content\" (NO blank lines between)\n\n**CRITICAL**: You MUST always generate detailed_minutes for business meetings. Only set detailed_minutes to null if the transcript is clearly not a meeting (e.g., a very short casual conversation with no business content). For any meeting with discussion topics, decisions, or action items, you MUST provide detailed_minutes in the compact Markdown format above.",
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
1. **Compact & Professional Format**: Generate meeting minutes in a compact, professional style similar to ChatGPT's output:
   - Use concise, direct language - remove filler words and redundant phrases
   - Keep bullet points to one line when possible
   - NO horizontal rules (------) between sections - use only section headings
   - **ZERO blank lines** - Do not include any empty lines (\\n\\n) in the output. Sections should flow directly one after another
   - Clear sections with numbered headings (e.g., "1. 会议目标 (Objectives)", "2. 对方当前状况与规划 (Partner Updates)")
   - Use both Chinese and English headings where appropriate
   - Structure with subsections (e.g., "2.1 Stablecoin 与 Smart Contract 状态")
   - Each section should be compact and information-dense
   - Format: "# Section Title\\nContent\\n# Next Section" (NO blank lines between sections)

2. **Language**: Preserve the language mix (Cantonese-English) in your output. If the transcript uses mixed languages, your summary should too.

3. **Content Structure**: The detailed_minutes should include:
   - Meeting topic/theme (会议主题) - concise
   - Meeting date (会议日期) - infer from context if not explicitly stated
   - Attendees (与会人员) - extract participant names from transcript
   - Meeting objectives (会议目标) - numbered list, each objective in one concise line
   - Key discussion points organized by topic or participant - use bullet points, keep concise
   - Current status and planning information - direct and factual
   - Technical details, decisions, and next steps - remove verbose explanations

4. **Compact Writing Style**:
   - Remove redundant words: "discuss about" → "discuss", "in order to" → "to"
   - Use active voice: "We will complete" instead of "It will be completed by us"
   - Combine related points into single bullet points when possible
   - Remove filler phrases: "as we mentioned", "you know", "basically", etc.
   - Keep sentences short and direct

5. **Decisions**: Extract clear, specific decisions made during the meeting. Include who made the decision and what was decided. Format in one concise line when possible.

6. **Action Items**: Extract actionable tasks with:
   - Clear, concise description (one line)
   - Owner (extract name from transcript if mentioned, otherwise use "TBD")
   - Due date (extract from transcript if mentioned, otherwise null)
   - Priority (infer from context: urgent = high, normal = medium, nice-to-have = low)

7. **Related Segment IDs**: Try to match action items and decisions to transcript segments. Use "seg_0", "seg_1", etc. format.

8. **Accuracy**: Be precise and factual. Only include information explicitly mentioned in the transcript.

9. **Hong Kong Context**: Be aware of Hong Kong business culture, common terms, and code-switching patterns.

10. **Refinement**: Aggressively refine verbose spoken content into concise, professional written format:
    - Remove repetition and redundant explanations
    - Combine similar points
    - Use professional terminology instead of casual expressions
    - Keep all key information but in the most compact form possible
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
        prompt_parts.append("1. **overview**: 简短的执行摘要（2-3段），用于快速了解会议内容")
        prompt_parts.append("2. **detailed_minutes**: 根据会议内容，生成一份会议纪要，包括会议主题、日期、与会人员、会议目标、讨论要点、行动项、后续计划、会议结论等")
        prompt_parts.append("")
        prompt_parts.append("要求：")
        prompt_parts.append("- **紧凑格式**：参考 ChatGPT 的会议纪要风格，使用紧凑、专业的格式")
        prompt_parts.append("- **去除冗余**：对冗长口语内容进行提炼与结构化，去除填充词、重复内容，保持关键信息完整但格式紧凑")
        prompt_parts.append("- **简洁表达**：每个要点尽量一行，使用简洁直接的语言，去除不必要的解释和装饰性文字")
        prompt_parts.append("- **格式要求**：不使用水平分隔线（------），**完全不要使用空行**（不要有任何 \\n\\n），各章节直接连接，格式紧凑")
        prompt_parts.append("- **空行处理**：输出中不要包含任何空行，章节之间、列表之间都不要有空行，让内容紧凑连续")
        prompt_parts.append("- **重要**：必须生成 detailed_minutes，除非转录内容明显不是会议（如非常简短的闲聊）")
        prompt_parts.append("- detailed_minutes 应包含：会议主题、日期、与会人员、会议目标、讨论要点、行动项、后续计划、会议结论等")
        prompt_parts.append("- 保持原文的语言混合风格（中文简体-粤语-英语）")
        prompt_parts.append("- 按照系统提示词中的格式要求，生成结构化的 JSON 输出，确保 detailed_minutes 字段不为 null")

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


# Singleton instance
_summarization_service: SummarizationService | None = None


def get_summarization_service() -> SummarizationService:
    """Get or create summarization service instance."""
    global _summarization_service
    if _summarization_service is None:
        _summarization_service = SummarizationService()
    return _summarization_service

