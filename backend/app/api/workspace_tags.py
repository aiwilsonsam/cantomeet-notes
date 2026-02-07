"""Workspace tag CRUD API."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.models.workspace_tag import WorkspaceTag
from app.schemas.workspace_tag import (
    DEFAULT_WORKSPACE_TAGS,
    WorkspaceTagCreate,
    WorkspaceTagResponse,
)

router = APIRouter(prefix="/workspace-tags", tags=["workspace-tags"])


def _verify_workspace_access(db: Session, user_id: str, workspace_id: str) -> None:
    """Verify user has access to workspace. Raises HTTPException if not."""
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to workspace",
        )


def _ensure_seed_tags(db: Session, workspace_id: str) -> None:
    """Insert default tags if workspace has none."""
    count = db.query(WorkspaceTag).filter(WorkspaceTag.workspace_id == workspace_id).count()
    if count == 0:
        for name in DEFAULT_WORKSPACE_TAGS:
            tag = WorkspaceTag(workspace_id=workspace_id, name=name)
            db.add(tag)
        db.commit()


@router.get("", response_model=list[WorkspaceTagResponse])
def list_workspace_tags(
    workspace_id: Annotated[str, Query(description="Workspace ID")],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[WorkspaceTagResponse]:
    """List all workspace tags. Seeds default tags if none exist."""
    _verify_workspace_access(db, current_user.id, workspace_id)
    _ensure_seed_tags(db, workspace_id)
    tags = (
        db.query(WorkspaceTag)
        .filter(WorkspaceTag.workspace_id == workspace_id)
        .order_by(WorkspaceTag.name)
        .all()
    )
    return [
        WorkspaceTagResponse(id=t.id, workspace_id=t.workspace_id, name=t.name)
        for t in tags
    ]


@router.post("", response_model=WorkspaceTagResponse, status_code=status.HTTP_201_CREATED)
def create_workspace_tag(
    body: WorkspaceTagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> WorkspaceTagResponse:
    """Create a new workspace tag."""
    _verify_workspace_access(db, current_user.id, body.workspace_id)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag name is required")
    existing = (
        db.query(WorkspaceTag)
        .filter(WorkspaceTag.workspace_id == body.workspace_id, WorkspaceTag.name == name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag already exists")
    tag = WorkspaceTag(workspace_id=body.workspace_id, name=name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return WorkspaceTagResponse(id=tag.id, workspace_id=tag.workspace_id, name=tag.name)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_tag(
    tag_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> None:
    """Delete a workspace tag."""
    tag = db.query(WorkspaceTag).filter(WorkspaceTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    _verify_workspace_access(db, current_user.id, tag.workspace_id)
    db.delete(tag)
    db.commit()
