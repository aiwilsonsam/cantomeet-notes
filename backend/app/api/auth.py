"""Authentication API endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_session
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspacePlan, WorkspaceRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _create_user_response(user: User, db: Session) -> UserResponse:
    """Create a UserResponse from a User model, including workspace information."""
    # Get user's workspaces
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).all()
    workspaces = []
    active_workspace_id = None
    access_level = "admin"

    for membership in memberships:
        workspace = db.query(Workspace).filter(Workspace.id == membership.workspace_id).first()
        if workspace:
            workspaces.append(
                {
                    "id": workspace.id,
                    "name": workspace.name,
                    "logo": workspace.logo or workspace.name[:2].upper(),
                    "plan": workspace.plan.value,
                    "role": membership.role.value,
                }
            )
            # Use first workspace as active (or could be stored in user preferences)
            if active_workspace_id is None:
                active_workspace_id = workspace.id
                access_level = membership.access_level.value

    # Determine plan from active workspace
    plan = "Free"
    if active_workspace_id:
        active_workspace = db.query(Workspace).filter(Workspace.id == active_workspace_id).first()
        if active_workspace:
            plan = active_workspace.plan.value

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.full_name,
        plan=plan,
        quota={"used": 0, "limit": 60, "renewalDate": ""},  # TODO: Calculate from actual usage
        workspaces=workspaces,
        workspaceId=active_workspace_id,
        accessLevel=access_level,
        status="active",
        avatar=None,  # TODO: Add avatar field to User model
        role=None,  # TODO: Add role field to User model
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_session),
) -> TokenResponse:
    """
    Register a new user account.

    Args:
        request: Registration request with name, email, and password
        db: Database session

    Returns:
        Token response with JWT token and user information

    Raises:
        HTTPException: If email already exists
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    user = User(
        email=request.email,
        password_hash=get_password_hash(request.password),
        full_name=request.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default workspace for new user
    workspace = Workspace(
        name=f"{request.name}'s Workspace",
        plan=WorkspacePlan.FREE,
    )
    db.add(workspace)
    db.flush()  # Get workspace ID

    # Add user as admin of the workspace
    membership = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role=WorkspaceRole.ADMIN,
    )
    db.add(membership)
    db.commit()
    db.refresh(workspace)

    # Create access token
    access_token = create_access_token(data={"sub": user.id, "email": user.email})

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    user_response = _create_user_response(user, db)

    return TokenResponse(token=access_token, user=user_response)


@router.post("/login", response_model=TokenResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_session),
) -> TokenResponse:
    """
    Authenticate user and return JWT token.

    Args:
        request: Login request with email and password
        db: Database session

    Returns:
        Token response with JWT token and user information

    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(data={"sub": user.id, "email": user.email})

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    user_response = _create_user_response(user, db)

    return TokenResponse(token=access_token, user=user_response)


@router.post("/logout")
def logout(
    current_user: CurrentUser,
) -> dict[str, str]:
    """
    Logout user (client-side token removal).

    Note: Since we're using stateless JWT tokens, logout is primarily
    a client-side operation. The server doesn't maintain a session.
    Future enhancements could include token blacklisting.

    Args:
        current_user: Current authenticated user

    Returns:
        Success message
    """
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: CurrentUser,
    db: Session = Depends(get_session),
) -> UserResponse:
    """
    Get current authenticated user information.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        User information with workspace details
    """
    return _create_user_response(current_user, db)

