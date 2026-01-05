"""FastAPI application entrypoint for CantoMeet Notes."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import api_router, root_router
from .core.config import settings

app = FastAPI(title=settings.project_name, version=settings.version)

# CORS configuration
# Allow all origins in development, restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        # Production frontend URL
        "http://167.253.159.233:3004",
        # Add domain when using nginx proxy
        # "https://notes.companionai.life",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    """Provide a tiny landing response for quick manual checks."""
    return {"message": f"{settings.project_name} is running"}


# Include routers
app.include_router(root_router)
app.include_router(api_router)


