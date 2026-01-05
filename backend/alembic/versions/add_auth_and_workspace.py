"""add auth and workspace

Revision ID: add_auth_workspace
Revises: 79be45794254
Create Date: 2024-11-27 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_auth_workspace'
down_revision: Union[str, None] = '79be45794254'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Detect database dialect
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'
    
    # Add password_hash to users table
    op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=False, server_default=''))
    
    # Create workspaces table
    op.create_table('workspaces',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('logo', sa.String(length=512), nullable=True),
        sa.Column('plan', sa.Enum('FREE', 'PRO', 'ENTERPRISE', name='workspaceplan'), nullable=False, server_default='FREE'),
        sa.Column('invite_code', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspaces_invite_code'), 'workspaces', ['invite_code'], unique=True)
    
    # Create workspace_members table
    op.create_table('workspace_members',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workspace_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.Enum('ADMIN', 'MEMBER', name='workspacerole'), nullable=False, server_default='MEMBER'),
        sa.Column('access_level', sa.Enum('ADMIN', 'MEMBER', 'VIEWER', name='workspaceaccesslevel'), nullable=False, server_default='MEMBER'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspace_members_workspace_id'), 'workspace_members', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_workspace_members_user_id'), 'workspace_members', ['user_id'], unique=False)
    
    # Add columns to meetings table
    # SQLite doesn't support ALTER TABLE with foreign keys, use batch mode
    if is_sqlite:
        with op.batch_alter_table('meetings', schema=None) as batch_op:
            batch_op.add_column(sa.Column('workspace_id', sa.String(length=36), nullable=True))
            batch_op.add_column(sa.Column('tags', sa.JSON(), nullable=True))
            batch_op.add_column(sa.Column('template', sa.String(length=128), nullable=True))
            batch_op.add_column(sa.Column('hubspot_synced', sa.Boolean(), nullable=False, server_default='0'))
            # Note: SQLite doesn't enforce foreign keys in batch mode,
            # but we can add the column and application will enforce it
        # Create index separately (batch mode doesn't support it)
        op.create_index('ix_meetings_workspace_id', 'meetings', ['workspace_id'], unique=False)
    else:
        # For PostgreSQL and other databases
        op.add_column('meetings', sa.Column('workspace_id', sa.String(length=36), nullable=True))
        op.add_column('meetings', sa.Column('tags', sa.JSON(), nullable=True))
        op.add_column('meetings', sa.Column('template', sa.String(length=128), nullable=True))
        op.add_column('meetings', sa.Column('hubspot_synced', sa.Boolean(), nullable=False, server_default='0'))
        op.create_foreign_key('fk_meetings_workspace_id', 'meetings', 'workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')
        op.create_index(op.f('ix_meetings_workspace_id'), 'meetings', ['workspace_id'], unique=False)


def downgrade() -> None:
    # Detect database dialect
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'
    
    # Remove meeting columns
    op.drop_index('ix_meetings_workspace_id', table_name='meetings')
    
    if is_sqlite:
        with op.batch_alter_table('meetings', schema=None) as batch_op:
            batch_op.drop_column('hubspot_synced')
            batch_op.drop_column('template')
            batch_op.drop_column('tags')
            batch_op.drop_column('workspace_id')
    else:
        op.drop_constraint('fk_meetings_workspace_id', 'meetings', type_='foreignkey')
        op.drop_column('meetings', 'hubspot_synced')
        op.drop_column('meetings', 'template')
        op.drop_column('meetings', 'tags')
        op.drop_column('meetings', 'workspace_id')
    
    # Drop workspace_members table
    op.drop_index(op.f('ix_workspace_members_user_id'), table_name='workspace_members')
    op.drop_index(op.f('ix_workspace_members_workspace_id'), table_name='workspace_members')
    op.drop_table('workspace_members')
    
    # Drop workspaces table
    op.drop_index(op.f('ix_workspaces_invite_code'), table_name='workspaces')
    op.drop_table('workspaces')
    
    # Remove password_hash from users
    op.drop_column('users', 'password_hash')
