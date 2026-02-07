#!/bin/bash
# Start multiple RQ workers for parallel processing (multi-user, multi-workspace)
# Usage: ./start_workers_safe.sh [count]
# Default: 3 workers

set -e
cd "$(dirname "$0")/.."

COUNT=${1:-3}
if ! [[ "$COUNT" =~ ^[0-9]+$ ]] || [ "$COUNT" -lt 1 ]; then
    echo "Usage: $0 [worker_count]"
    echo "  worker_count: number of workers (default: 3)"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# CRITICAL: macOS fork() safety
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✅ macOS fork() safety fix enabled"
    if python3 -c "import certifi" 2>/dev/null; then
        CERT_PATH=$(python3 -c "import certifi; print(certifi.where())")
        export REQUESTS_CA_BUNDLE="$CERT_PATH"
        export SSL_CERT_FILE="$CERT_PATH"
        export CURL_CA_BUNDLE="$CERT_PATH"
        echo "✅ SSL certificates configured"
    fi
fi

echo "Starting $COUNT RQ worker(s)..."
for i in $(seq 1 "$COUNT"); do
    echo "  Worker $i/$COUNT starting..."
    python -m app.tasks.worker &
done

echo "✅ $COUNT workers started. Press Ctrl+C to stop all."
wait
