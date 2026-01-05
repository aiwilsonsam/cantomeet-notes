#!/bin/bash
# Start RQ worker for processing background tasks

cd "$(dirname "$0")/.."

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Fix for macOS fork() + multithreading issue
# This prevents crashes when RQ worker forks processes on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
fi

# Start RQ worker
echo "Starting RQ worker..."
rq worker --with-scheduler default high_priority --url "$REDIS_URL"

