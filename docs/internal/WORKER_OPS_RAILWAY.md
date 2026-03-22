# Railway Worker Ops

Use this runbook when enabling queue-backed background jobs on Railway.

## Purpose

The web app can enqueue non-critical work into Redis so request latency stays low.

Current queued workloads:

- outbound email
- optional async transcription
- notification digests
- optional analytics fan-out

## Required environment variables

- `REDIS_URL`
- one or more feature flags:
  - `ENABLE_TRANSCRIPTION_JOBS=true`
  - `ENABLE_EMAIL_JOBS=true`
  - `ENABLE_ANALYTICS_JOBS=true`
  - `ENABLE_NOTIFICATION_DIGEST_JOBS=true`
- SMTP credentials only if email jobs are enabled
- one transcription provider:
  - `DEEPGRAM_API_KEY` with optional `DEEPGRAM_MODEL`
  - or `OPENAI_API_KEY` with optional `OPENAI_TRANSCRIBE_MODEL`
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
6. Set only the feature flags you actually want live

Recommended safe first rollout:

- `ENABLE_TRANSCRIPTION_JOBS=true`
- leave email/digest flags off until SMTP/domain is ready
- set `TRANSCRIPTION_PROVIDER=deepgram` if using Deepgram

## Rollout checklist

- Redis provisioned and reachable from Railway
- Worker service deployed successfully
- Web service has the intended queue feature flags enabled
- `/api/health` returns healthy
- `/api/ready` returns ready
- Async transcription route returns `202` and `jobId` when called with `?mode=async`
- Queue health shows transcription enabled
- Enable email jobs only after SMTP is verified
- Worker logs show job processing events

## Rollback

If background jobs misbehave:

1. Turn off the relevant feature flags on the web service
2. Redeploy the web service
3. Leave the worker idle or scale it down

This returns queued features to their inline or disabled execution paths.
