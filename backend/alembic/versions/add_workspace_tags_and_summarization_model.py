"""add workspace_tags table and workspaces.summarization_model

Revision ID: add_workspace_tags
Revises: add_prompt_templates
Create Date: 2026-02-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_workspace_tags"
down_revision: Union[str, None] = "add_prompt_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column("summarization_model", sa.String(64), nullable=True),
    )

    op.create_table(
        "workspace_tags",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("workspace_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "name", name="uq_workspace_tags_ws_name"),
    )
    op.create_index(
        op.f("ix_workspace_tags_workspace_id"),
        "workspace_tags",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_workspace_tags_workspace_id"), table_name="workspace_tags")
    op.drop_table("workspace_tags")
    op.drop_column("workspaces", "summarization_model")
