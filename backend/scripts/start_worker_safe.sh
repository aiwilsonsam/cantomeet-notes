#!/bin/bash
# Start RQ worker with macOS fork() safety fix

cd "$(dirname "$0")/.."

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# CRITICAL: Set environment variable for macOS fork() safety
# This must be set before Python starts
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

# Also set it in the current shell session
if [[ "$OSTYPE" == "darwin"* ]]; then
    export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
    echo "✅ macOS fork() safety fix enabled"
    
    # Fix SSL certificate issues on macOS
    # Try to set SSL certificate paths if certifi is available
    if python3 -c "import certifi" 2>/dev/null; then
        CERT_PATH=$(python3 -c "import certifi; print(certifi.where())")
        export REQUESTS_CA_BUNDLE="$CERT_PATH"
        export SSL_CERT_FILE="$CERT_PATH"
        export CURL_CA_BUNDLE="$CERT_PATH"
        echo "✅ SSL certificates configured: $CERT_PATH"
    else
        echo "⚠️  certifi not found, SSL certificates may not work properly"
        echo "   Install with: pip install certifi"
    fi
fi

# Start RQ worker
echo "Starting RQ worker..."
python -m app.tasks.worker

