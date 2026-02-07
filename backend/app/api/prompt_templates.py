"""Prompt template CRUD API."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_session
from app.models.prompt_template import PromptTemplate
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.prompt_template import (
    PromptTemplateCreate,
    PromptTemplateResponse,
    PromptTemplateUpdate,
)

router = APIRouter(prefix="/prompt-templates", tags=["prompt-templates"])


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


def _verify_template_access(db: Session, user_id: str, template: PromptTemplate) -> None:
    """Verify user has access to template's workspace."""
    _verify_workspace_access(db, user_id, template.workspace_id)


@router.get("", response_model=list[PromptTemplateResponse])
def list_prompt_templates(
    workspace_id: Annotated[str, Query(description="Workspace ID")],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[PromptTemplateResponse]:
    """List all prompt templates for a workspace."""
    _verify_workspace_access(db, current_user.id, workspace_id)
    templates = (
        db.query(PromptTemplate)
        .filter(PromptTemplate.workspace_id == workspace_id)
        .order_by(PromptTemplate.created_at.desc())
        .all()
    )
    return [
        PromptTemplateResponse(id=t.id, workspace_id=t.workspace_id, name=t.name, content=t.content)
        for t in templates
    ]


@router.post("", response_model=PromptTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_prompt_template(
    body: PromptTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> PromptTemplateResponse:
    """Create a new prompt template."""
    _verify_workspace_access(db, current_user.id, body.workspace_id)
    template = PromptTemplate(
        workspace_id=body.workspace_id,
        name=body.name,
        content=body.content,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return PromptTemplateResponse(
        id=template.id,
        workspace_id=template.workspace_id,
        name=template.name,
        content=template.content,
    )


@router.get("/{template_id}", response_model=PromptTemplateResponse)
def get_prompt_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> PromptTemplateResponse:
    """Get a prompt template by ID."""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    _verify_template_access(db, current_user.id, template)
    return PromptTemplateResponse(
        id=template.id,
        workspace_id=template.workspace_id,
        name=template.name,
        content=template.content,
    )


@router.put("/{template_id}", response_model=PromptTemplateResponse)
def update_prompt_template(
    template_id: str,
    body: PromptTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> PromptTemplateResponse:
    """Update a prompt template."""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    _verify_template_access(db, current_user.id, template)
    if body.name is not None:
        template.name = body.name
    if body.content is not None:
        template.content = body.content
    db.commit()
    db.refresh(template)
    return PromptTemplateResponse(
        id=template.id,
        workspace_id=template.workspace_id,
        name=template.name,
        content=template.content,
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompt_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> None:
    """Delete a prompt template."""
    template = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    _verify_template_access(db, current_user.id, template)
    db.delete(template)
    db.commit()
