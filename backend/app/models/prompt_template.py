"""Prompt template model for user-defined meeting minutes prompts."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models import TimestampMixin


class PromptTemplate(TimestampMixin, Base):
    """User-defined prompt template for generating meeting minutes.

    Template content uses {{content}} as placeholder for transcript text.
    Example: 根据以下中粤会话的转录，生成一份会议纪要。\n{{content}}
    """

    __tablename__ = "prompt_templates"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Prompt with {{content}} placeholder

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="prompt_templates")

    def __repr__(self) -> str:
        return f"<PromptTemplate id={self.id} name={self.name}>"
