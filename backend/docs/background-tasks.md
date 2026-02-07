# Background Tasks Architecture

## Overview

CantoMeet Notes uses **RQ (Redis Queue)** for asynchronous processing of long-running tasks. This allows the API to return immediately after file upload while transcription and summarization happen in the background.

## Architecture

```
User Upload → API Endpoint → Save File → Enqueue Task → Return Meeting ID
                                      ↓
                              RQ Task Queue (Redis)
                                      ↓
                              RQ Worker Process
                                      ↓
                        [Transcription Task]
                                      ↓
                        [Summarization Task] (future)
```

## Task Flow

1. **Upload** (`POST /meetings/upload`)
   - User uploads audio file
   - File saved to storage
   - Meeting record created with status `UPLOADED`
   - Transcription task enqueued
   - API returns immediately with meeting ID

2. **Transcription Task** (`app.tasks.transcription.transcribe_meeting_task`)
   - Picked up by RQ worker
   - Meeting status → `TRANSCRIBING`
   - Creates Speechmatics job
   - Polls until completion (may take 10-30 minutes)
   - Saves transcript to database
   - Meeting status → `SUMMARIZING`
   - Triggers summarization task (future)

3. **Summarization Task** (to be implemented)
   - Reads transcript
   - Calls LLM API
   - Generates structured summary
   - Saves to database
   - Meeting status → `COMPLETED`

## Setup

### 1. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### 2. Configure Redis URL

In `.env`:
```bash
REDIS_URL=redis://localhost:6379/0
```

### 3. Start RQ Worker(s)

```bash
# Single worker
./scripts/start_worker.sh
# macOS: ./scripts/start_worker_safe.sh

# Multiple workers (parallel processing for multi-user, multi-workspace)
./scripts/start_workers_safe.sh 3

# Or using rq command (one worker per terminal)
rq worker --with-scheduler default high_priority
```

**Concurrency**: Run multiple workers to process jobs in parallel. Each worker handles one job at a time; N workers enable N concurrent transcription/summarization tasks. Recommended for production with multiple users and workspaces.

## Task Configuration

Tasks are configured with:
- **Job timeout**: 2 hours (for long audio files)
- **Result TTL**: 24 hours (keep results for 24h)
- **Failure TTL**: 24 hours (keep failed job info for 24h)

## Monitoring

### RQ Dashboard

Install and run RQ Dashboard:
```bash
pip install rq-dashboard
rq-dashboard
```

Access at: http://localhost:9181

### Redis CLI

```bash
redis-cli
> KEYS rq:*
> GET rq:job:<job_id>
```

## Error Handling

- Failed tasks update Meeting status to `FAILED`
- Error details stored in `meeting.status_reason`
- Failed job info kept in Redis for 24 hours
- Can be retried manually or automatically (future enhancement)

## Concurrency

The design supports parallel processing:

- **Multiple workers**: Run `./scripts/start_workers_safe.sh 3` or scale with `docker compose up -d --scale worker=3`
- **Database**: Connection pool configured for concurrent workers (`pool_pre_ping`, `pool_size`, `max_overflow`)
- **Tasks**: Each job is independent (per meeting); no shared mutable state between jobs
- **Bottlenecks**: External APIs (Whisper, GPT-4o) may have rate limits under heavy concurrency

## Future Enhancements

- Automatic retry for failed tasks
- Task progress tracking
- WebSocket notifications for status updates
- Priority queues for urgent tasks
- Scheduled tasks (e.g., cleanup old files)

