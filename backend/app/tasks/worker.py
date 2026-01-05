#!/usr/bin/env python3
"""RQ worker entry point for running background tasks.

Usage:
    python -m app.tasks.worker

Or use rq worker command:
    rq worker --with-scheduler
"""

# CRITICAL: Set environment variable BEFORE any other imports
# This must be done before importing any modules that might use Objective-C
# (like httpx, which is used by speechmatics_client)
import os
import sys

# Fix for macOS fork() + multithreading issue
# This prevents crashes when RQ worker forks processes on macOS
# See: https://github.com/rq/rq/issues/1358
if sys.platform == "darwin":  # macOS
    # Force set the environment variable (don't use setdefault, use direct assignment)
    os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"
    # Also set multiprocessing start method to 'spawn' if possible
    try:
        import multiprocessing
        # Try to set spawn method (requires Python 3.8+)
        if hasattr(multiprocessing, "set_start_method"):
            try:
                multiprocessing.set_start_method("spawn", force=True)
            except RuntimeError:
                # Already set, ignore
                pass
    except ImportError:
        pass

# Fix SSL certificate issues on macOS
# Set SSL certificate paths before any imports that might use SSL
try:
    import certifi
    cert_path = certifi.where()
    # Set environment variables for SSL certificate location
    # This ensures all SSL connections (httpx, requests, etc.) use certifi's certificates
    os.environ.setdefault("REQUESTS_CA_BUNDLE", cert_path)
    os.environ.setdefault("SSL_CERT_FILE", cert_path)
    os.environ.setdefault("CURL_CA_BUNDLE", cert_path)
except ImportError:
    # certifi not installed, will be handled when Whisper client is initialized
    pass

import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from redis import Redis
from rq import Worker

from app.core.config import settings
from app.tasks.queue import default_queue, high_priority_queue, redis_conn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    """Start RQ worker to process background tasks."""
    logger.info("Starting RQ worker...")
    logger.info(f"Redis URL: {settings.redis_url}")
    logger.info(f"Queues: default, high_priority")

    # Create worker that listens to both queues
    worker = Worker(
        [default_queue, high_priority_queue],
        connection=redis_conn,
        name="cantomeet-worker",
    )

    # Start worker (this blocks)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()

