"""Workspace API endpoints."""

import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser
from app.db.session import get_session
from app.models.workspace import (
    Workspace,
    WorkspaceAccessLevel,
    WorkspaceMember,
    WorkspacePlan,
    WorkspaceRole,
)
from app.schemas.workspace import (
    CreateWorkspaceRequest,
    JoinWorkspaceRequest,
    WorkspaceResponse,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code for workspace."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.get("", response_model=list[WorkspaceResponse])
def list_workspaces(
    current_user: CurrentUser,
    db: Session = Depends(get_session),
) -> list[WorkspaceResponse]:
    """
    Get all workspaces the current user is a member of.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of workspaces with user's role
    """
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).all()
    workspaces = []
    for membership in memberships:
        workspace = db.query(Workspace).filter(Workspace.id == membership.workspace_id).first()
        if workspace:
            workspaces.append(
                WorkspaceResponse(
                    id=workspace.id,
                    name=workspace.name,
                    logo=workspace.logo or workspace.name[:2].upper(),
                    plan=workspace.plan,
                    role=membership.role,
                )
            )
    return workspaces


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_session),
) -> WorkspaceResponse:
    """
    Get a specific workspace by ID.

    Args:
        workspace_id: Workspace ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Workspace information

    Raises:
        HTTPException: If workspace not found or user is not a member
    """
    # Check if user is a member
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied",
        )

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        logo=workspace.logo or workspace.name[:2].upper(),
        plan=workspace.plan,
        role=membership.role,
    )


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    request: CreateWorkspaceRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_session),
) -> WorkspaceResponse:
    """
    Create a new workspace.

    Args:
        request: Workspace creation request
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created workspace information
    """
    # Generate invite code
    invite_code = generate_invite_code()
    # Ensure uniqueness
    while db.query(Workspace).filter(Workspace.invite_code == invite_code).first():
        invite_code = generate_invite_code()

    workspace = Workspace(
        name=request.name,
        plan=request.plan,
        invite_code=invite_code,
    )
    db.add(workspace)
    db.flush()  # Get workspace ID

    # Add creator as admin
    membership = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role=WorkspaceRole.ADMIN,
        access_level=WorkspaceAccessLevel.ADMIN,
    )
    db.add(membership)
    db.commit()
    db.refresh(workspace)

    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        logo=workspace.logo or workspace.name[:2].upper(),
        plan=workspace.plan,
        role=WorkspaceRole.ADMIN,
    )


@router.post("/join", response_model=WorkspaceResponse)
def join_workspace(
    request: JoinWorkspaceRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_session),
) -> WorkspaceResponse:
    """
    Join a workspace using an invite code.

    Args:
        request: Join request with invite code
        current_user: Current authenticated user
        db: Database session

    Returns:
        Workspace information

    Raises:
        HTTPException: If invite code is invalid or user already a member
    """
    # Find workspace by invite code
    workspace = db.query(Workspace).filter(Workspace.invite_code == request.inviteCode).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code",
        )

    # Check if user is already a member
    existing_membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this workspace",
        )

    # Add user as member
    membership = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role=WorkspaceRole.MEMBER,
        access_level=WorkspaceAccessLevel.MEMBER,
    )
    db.add(membership)
    db.commit()

    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        logo=workspace.logo or workspace.name[:2].upper(),
        plan=workspace.plan,
        role=WorkspaceRole.MEMBER,
    )


@router.post("/{workspace_id}/switch")
def switch_workspace(
    workspace_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_session),
) -> dict[str, str]:
    """
    Switch active workspace (for session management).

    Note: This is primarily a client-side operation. The server doesn't
    maintain active workspace state. This endpoint validates that the user
    is a member of the workspace.

    Args:
        workspace_id: Workspace ID to switch to
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If workspace not found or user is not a member
    """
    # Verify user is a member
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied",
        )

    return {"message": "Workspace switched successfully", "workspace_id": workspace_id}

