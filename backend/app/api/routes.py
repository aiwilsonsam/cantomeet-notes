"""API route definitions for the CantoMeet Notes backend."""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.meetings import router as meetings_router
from app.api.tasks import router as tasks_router
from app.api.transcription import router as transcription_router
from app.api.workspaces import router as workspaces_router

api_router = APIRouter(prefix="/api")

# Include sub-routers
api_router.include_router(auth_router)
api_router.include_router(workspaces_router)
api_router.include_router(meetings_router)
api_router.include_router(tasks_router)
api_router.include_router(transcription_router)


@api_router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """Simple readiness probe for uptime checks."""
    return {"status": "ok"}


# Also add health check at root level for convenience
root_router = APIRouter()


@root_router.get("/health", tags=["health"])
def root_health_check() -> dict[str, str]:
    """Health check at root level."""
    return {"status": "ok"}


