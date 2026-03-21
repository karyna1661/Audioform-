# Railway Worker Ops

Use this runbook when enabling queue-backed background jobs on Railway.

## Purpose

The web app can enqueue non-critical work into Redis so request latency stays low.

Current queued workloads:

- outbound email
- optional async transcription
- placeholder notification digests
- optional analytics fan-out

## Required environment variables

- `REDIS_URL`
- `ENABLE_BACKGROUND_JOBS=true`
- SMTP credentials for email jobs
- `OPENAI_API_KEY` if async transcription is enabled in production
- all standard app env vars already used by the web service

## Worker command

```bash
npm run worker:queue
```

## Recommended Railway setup

1. Create a separate Railway service for the worker
2. Point it at the same repo and branch as the web service
3. Use the start command:

```bash
npm run worker:queue
```

4. Copy the same env vars used by the web service
5. Add `REDIS_URL`
6. Set `ENABLE_BACKGROUND_JOBS=true`

## Rollout checklist

- Redis provisioned and reachable from Railway
- Worker service deployed successfully
- Web service has `ENABLE_BACKGROUND_JOBS=true`
- `/api/health` returns healthy
- `/api/ready` returns ready
- Email route returns `deliveryMode: queued`
- Async transcription route returns `202` and `jobId` when called with `?mode=async`
- Worker logs show job processing events

## Rollback

If background jobs misbehave:

1. Set `ENABLE_BACKGROUND_JOBS=false` on the web service
2. Redeploy the web service
3. Leave the worker idle or scale it down

This returns email and transcription behavior to inline execution paths.
