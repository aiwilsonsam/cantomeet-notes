"""RQ queue connection and configuration."""

from redis import Redis
from rq import Queue

from app.core.config import settings

# Create Redis connection
redis_conn = Redis.from_url(settings.redis_url, decode_responses=False)

# Create default queue for transcription and summarization tasks
default_queue = Queue("default", connection=redis_conn)

# Create high priority queue for urgent tasks (future use)
high_priority_queue = Queue("high_priority", connection=redis_conn)

