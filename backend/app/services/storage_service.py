"""Storage service for audio file uploads (local filesystem or S3-compatible)."""

import os
import uuid
from pathlib import Path
from typing import BinaryIO

from app.core.config import settings


class StorageService:
    """Handles audio file storage with local filesystem or S3 fallback."""

    def __init__(self) -> None:
        """Initialize storage service with configured backend."""
        self.storage_type = "local"  # Default to local for MVP
        if settings.s3_endpoint and settings.s3_bucket:
            self.storage_type = "s3"
            # TODO: Initialize boto3 client when S3 is configured
            # self.s3_client = boto3.client('s3', endpoint_url=str(settings.s3_endpoint))

        # Local storage directory
        self.local_storage_dir = Path("uploads/audio")
        if self.storage_type == "local":
            self.local_storage_dir.mkdir(parents=True, exist_ok=True)

    def save_file(self, file_content: BinaryIO, filename: str, meeting_id: str) -> str:
        """
        Save uploaded audio file and return storage path/URI.

        Args:
            file_content: File-like object containing audio data
            filename: Original filename from upload
            meeting_id: UUID of the meeting record

        Returns:
            Storage path (relative for local, URI for S3)
        """
        # Generate unique filename to avoid collisions
        file_ext = Path(filename).suffix.lower()
        unique_filename = f"{meeting_id}_{uuid.uuid4().hex[:8]}{file_ext}"
        storage_path = f"{meeting_id}/{unique_filename}"

        if self.storage_type == "local":
            return self._save_local(file_content, storage_path)
        else:
            # TODO: Implement S3 upload when needed
            raise NotImplementedError("S3 storage not yet implemented")

    def _save_local(self, file_content: BinaryIO, storage_path: str) -> str:
        """Save file to local filesystem."""
        full_path = self.local_storage_dir / storage_path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        with open(full_path, "wb") as f:
            # Reset file pointer if needed
            file_content.seek(0)
            f.write(file_content.read())

        # Return relative path for database storage
        return str(storage_path)

    def get_file_path(self, storage_path: str) -> Path | None:
        """
        Get local filesystem path for a stored file.

        Args:
            storage_path: Storage path from database

        Returns:
            Path object if file exists locally, None otherwise
        """
        if self.storage_type != "local":
            return None

        full_path = self.local_storage_dir / storage_path
        if full_path.exists():
            return full_path
        return None

    def delete_file(self, storage_path: str) -> bool:
        """
        Delete a stored file.

        Args:
            storage_path: Storage path from database

        Returns:
            True if deleted successfully, False otherwise
        """
        if self.storage_type == "local":
            full_path = self.local_storage_dir / storage_path
            if full_path.exists():
                full_path.unlink()
                # Clean up empty parent directory
                try:
                    full_path.parent.rmdir()
                except OSError:
                    pass  # Directory not empty or other error
                return True
            return False
        else:
            # TODO: Implement S3 deletion
            raise NotImplementedError("S3 storage not yet implemented")


# Singleton instance
storage_service = StorageService()

