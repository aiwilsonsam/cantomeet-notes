# CantoMeet Notes – Backend

FastAPI-based backend service powering the CantoMeet Notes MVP. It exposes a simple `/health` endpoint today and will later orchestrate audio uploads, Speechmatics transcription, and LLM summarization.

## Project Structure

```
backend/
├── app/
│   ├── api/            # FastAPI routers
│   ├── core/           # Settings and global config
│   ├── db/             # Engine/session + declarative base
│   └── models/         # SQLAlchemy models (User/Meeting/etc.)
├── alembic/            # Migration environment + versions
└── pyproject.toml      # Python project metadata & dependencies
```

## Prerequisites

- Python 3.10+
- Redis (for background task queue)
  - macOS: `brew install redis` then `brew services start redis`
  - Linux: `sudo apt-get install redis-server` or use Docker
  - Docker: `docker run -d -p 6379:6379 redis:7-alpine`
- (Optional) [`uv`](https://github.com/astral-sh/uv) or `pip` for dependency installation

## Local Development

1. **Create a virtual environment**
   ```bash
   cd /Users/baron.shen/Workspace/AI/cantomeet-notes/backend
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install --upgrade pip
   pip install -e '.[dev]'
   ```

3. **Set environment variables**
   - Create a `.env` file in the `backend/` directory with the following variables:
     ```bash
     # Database (optional - defaults to SQLite)
     DATABASE_URL=sqlite:///./backend.db
     
     # Speechmatics ASR API (required for transcription)
     # Get your API key from: https://portal.speechmatics.com/settings/api-keys
     SPEECHMATICS_API_KEY=your_api_key_here
     # Optional: defaults to https://asr.api.speechmatics.com (production Batch API)
     # For other regions, use: eu.asr.api.speechmatics.com, us.asr.api.speechmatics.com, etc.
     SPEECHMATICS_BASE_URL=https://asr.api.speechmatics.com
     
     # OpenAI API (for summarization - to be implemented)
     OPENAI_API_KEY=your_openai_key_here
     
     # Redis (for background task queue)
     REDIS_URL=redis://localhost:6379/0
     ```
   - If `DATABASE_URL` is not set, the app defaults to a local SQLite database at `backend/backend.db`.
   - If `REDIS_URL` is not set, defaults to `redis://localhost:6379/0`.
   - **Note**: Speechmatics API key is required for transcription functionality.

4. **Run database migrations (optional during MVP)**
   ```bash
   alembic upgrade head
   ```

5. **Start Redis** (if not already running)
   ```bash
   # macOS with Homebrew
   brew services start redis
   
   # Or using Docker
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

6. **Start the RQ worker** (in a separate terminal)
   ```bash
   # Option 1: Using the script
   ./scripts/start_worker.sh
   
   # Option 2: Using rq command directly
   rq worker --with-scheduler default high_priority
   
   # Option 3: Using Python module
   python -m app.tasks.worker
   ```
   The worker processes background tasks (transcription, summarization) asynchronously.

7. **Run the development server** (in another terminal)
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

8. **Health check**
   - Visit `http://localhost:8000/health` to verify you receive `{ "status": "ok" }`.

## Testing Speechmatics Integration

To test the Speechmatics ASR client directly:

```bash
# Make sure SPEECHMATICS_API_KEY is set in your environment
python scripts/test_speechmatics.py path/to/audio.m4a
```

This will:
1. Create a transcription job
2. Poll until completion
3. Display the normalized transcript result

## Background Tasks

The backend uses **RQ (Redis Queue)** for asynchronous processing of long-running tasks:

- **Transcription tasks**: Process audio files via Speechmatics API (may take 10-30 minutes for 1-2 hour recordings)
- **Summarization tasks**: Generate meeting summaries via LLM (to be implemented)

When you upload a meeting audio file, the API:
1. Immediately saves the file and creates a Meeting record
2. Returns the meeting ID with status `UPLOADED`
3. Enqueues a background transcription task
4. The RQ worker picks up the task and processes it asynchronously
5. Meeting status updates: `UPLOADED → TRANSCRIBING → SUMMARIZING → COMPLETED`

### Monitoring Tasks

You can monitor RQ tasks using:
- RQ Dashboard: `pip install rq-dashboard` then `rq-dashboard`
- Or check Redis directly: `redis-cli`

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /meetings/upload` - Upload meeting audio file
  - Form data: `file` (audio file), `title` (string), `description` (optional string)
  - Returns immediately with meeting ID (transcription happens in background)

## Next Steps

- Implement LLM summarization service (B5) - as background task
- Add meeting list and detail REST APIs (B7)
- Add status polling endpoint for checking processing progress


