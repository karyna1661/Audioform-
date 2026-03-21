# Deployment (Railway) — P0 Beta

This is the **single source of truth** for deploying Audioform to Railway and verifying the launch.

## Prerequisites

- Railway project access
- Supabase project access
- Railway environment variables configured

## Step 1 — Database (Supabase)

Run:
- Base schema: `database/schema-production.sql`
- Any required migrations: `database/migrations/*.sql`

Follow: `docs/internal/DATABASE_SETUP_SUPABASE.md`

## Step 2 — Configure Railway env vars

Required:
- `AUTH_SESSION_SECRET`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_VERIFICATION_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Recommended:
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_ID` or `B2_BUCKET_NAME`
- `REDIS_URL`
- `ENABLE_BACKGROUND_JOBS=true` (only when a queue worker is deployed)
- SMTP vars for notifications (optional)

## Step 3 — Deploy

### Option A: Git push (recommended)

```bash
git add .
git commit -m "deploy: P0 beta"
git push origin main
```

### Option B: Railway CLI

```bash
railway link --project <project-id>
railway up
```

### Optional queue worker

When Redis is configured and background jobs are enabled, run a separate worker service with:

```bash
npm run worker:queue
```

Use this only after setting:

- `REDIS_URL`
- `ENABLE_BACKGROUND_JOBS=true`
- SMTP credentials

Current queue-backed jobs:

- outbound email
- optional async transcription via `/api/transcribe?mode=async`

## Step 4 — Smoke test (10 minutes)

### Auth
- Login works
- Refresh keeps session
- Logout works

### Survey flow
- Create survey (draft) → refresh persists
- Publish survey

### Response capture
- Open published survey link (try incognito for anon)
- Submit audio response
- Verify response shows in inbox (`/admin/responses`)
- Verify playback works

### Moderation
- Flag / High signal / Bookmark
- Refresh → persists

### Analytics
- Confirm `/api/analytics` returns success for actions

### Readiness and health
- Confirm `/api/health` returns `200` in a healthy environment
- Confirm `/api/ready` returns `200` before marking the deploy ready
- If Redis is configured, verify rate-limited endpoints still behave normally

## Rollback (if needed)

- Roll back in Railway to previous deployment or revert commit and redeploy.

