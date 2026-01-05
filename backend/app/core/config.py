"""Application configuration powered by pydantic-settings."""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized configuration for the backend service."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "CantoMeet Notes API"
    version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"

    database_url: str = Field(default="sqlite:///./backend.db", validation_alias="DATABASE_URL")

    # Redis configuration for RQ task queue
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias="REDIS_URL",
        description="Redis connection URL for RQ task queue",
    )

    speechmatics_api_key: str | None = Field(default=None, validation_alias="SPEECHMATICS_API_KEY")
    speechmatics_base_url: AnyHttpUrl | None = Field(
        default=None,
        validation_alias="SPEECHMATICS_BASE_URL",
        description="Speechmatics Batch API base URL. Defaults to https://asr.api.speechmatics.com if not set.",
    )

    openai_api_key: str | None = Field(default=None, validation_alias="OPENAI_API_KEY")

    # ASR Provider selection
    asr_provider: Literal["speechmatics", "whisper"] = Field(
        default="speechmatics",
        validation_alias="ASR_PROVIDER",
        description="ASR provider to use: 'speechmatics' or 'whisper' (for mixed language support)",
    )

    s3_endpoint: AnyHttpUrl | None = Field(default=None, validation_alias="S3_ENDPOINT")
    s3_bucket: str | None = Field(default=None, validation_alias="S3_BUCKET")

    # JWT Authentication
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        validation_alias="SECRET_KEY",
        description="Secret key for JWT token signing",
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=60 * 24,  # 24 hours
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES",
        description="Access token expiration time in minutes",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance to avoid re-parsing env vars."""
    return Settings()  # type: ignore[call-arg]


settings = get_settings()


