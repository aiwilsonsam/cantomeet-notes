"""add_processing_task_table

Revision ID: 23160bf014ef
Revises: add_auth_workspace
Create Date: 2025-12-05 13:29:21.464901

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23160bf014ef'
down_revision: Union[str, None] = 'add_auth_workspace'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Detect database dialect
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'
    
    # Create processing_tasks table
    # For SQLite, we need to handle foreign keys differently
    if is_sqlite:
        # SQLite: Create table without foreign key constraints (they're not enforced anyway)
        op.create_table('processing_tasks',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('workspace_id', sa.String(length=36), nullable=False),
            sa.Column('filename', sa.String(length=512), nullable=False),
            sa.Column('file_size', sa.Integer(), nullable=False),
            sa.Column('status', sa.Enum('QUEUED', 'PROCESSING', 'REVIEW_READY', 'COMPLETED', 'FAILED', name='taskstatus'), server_default='QUEUED', nullable=False),
            sa.Column('progress', sa.Integer(), server_default='0', nullable=False),
            sa.Column('logs', sa.JSON(), nullable=True),
            sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('meeting_id', sa.String(length=36), nullable=True),
            sa.Column('rq_job_id', sa.String(length=255), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
    else:
        # PostgreSQL and other databases: Create table with foreign key constraints
        op.create_table('processing_tasks',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('workspace_id', sa.String(length=36), nullable=False),
            sa.Column('filename', sa.String(length=512), nullable=False),
            sa.Column('file_size', sa.Integer(), nullable=False),
            sa.Column('status', sa.Enum('QUEUED', 'PROCESSING', 'REVIEW_READY', 'COMPLETED', 'FAILED', name='taskstatus'), server_default='QUEUED', nullable=False),
            sa.Column('progress', sa.Integer(), server_default='0', nullable=False),
            sa.Column('logs', sa.JSON(), nullable=True),
            sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('meeting_id', sa.String(length=36), nullable=True),
            sa.Column('rq_job_id', sa.String(length=255), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Create indexes
    op.create_index(op.f('ix_processing_tasks_meeting_id'), 'processing_tasks', ['meeting_id'], unique=False)
    op.create_index(op.f('ix_processing_tasks_rq_job_id'), 'processing_tasks', ['rq_job_id'], unique=False)
    op.create_index(op.f('ix_processing_tasks_workspace_id'), 'processing_tasks', ['workspace_id'], unique=False)
    
    # Note: For SQLite, we don't add foreign key constraint to meetings.workspace_id
    # because SQLite doesn't support ALTER TABLE to add foreign keys.
    # The column already exists from the previous migration, and application logic will enforce the relationship.
    # For PostgreSQL, the foreign key was already added in the previous migration.
    if not is_sqlite:
        # Only add foreign key constraint for meetings.workspace_id if it doesn't exist
        # (It should already exist from previous migration, but Alembic might detect it as missing)
        # We'll skip this to avoid errors if it already exists
        pass


def downgrade() -> None:
    # Detect database dialect
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'
    
    # Drop indexes
    op.drop_index(op.f('ix_processing_tasks_workspace_id'), table_name='processing_tasks')
    op.drop_index(op.f('ix_processing_tasks_rq_job_id'), table_name='processing_tasks')
    op.drop_index(op.f('ix_processing_tasks_meeting_id'), table_name='processing_tasks')
    
    # Drop table
    op.drop_table('processing_tasks')
    
    # Note: We don't drop the foreign key constraint on meetings.workspace_id
    # because it was never added for SQLite, and for PostgreSQL it was added in a previous migration

