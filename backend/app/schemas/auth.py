"""Pydantic schemas for authentication endpoints."""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Schema for user login request."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")


class RegisterRequest(BaseModel):
    """Schema for user registration request."""

    name: str = Field(..., min_length=1, max_length=255, description="User full name")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    token: str = Field(..., description="JWT access token")
    user: "UserResponse" = Field(..., description="User information")


class UserResponse(BaseModel):
    """Schema for user information in responses."""

    id: str
    email: str
    name: str | None
    plan: str = "Free"  # Default plan, will be determined from workspace
    quota: dict = Field(default_factory=lambda: {"used": 0, "limit": 60, "renewalDate": ""})
    workspaces: list = Field(default_factory=list)  # Will be populated from workspace memberships
    workspaceId: str | None = None
    accessLevel: str = "admin"
    status: str = "active"
    avatar: str | None = None
    role: str | None = None

    class Config:
        """Pydantic config."""

        from_attributes = True


# Update forward references
TokenResponse.model_rebuild()

