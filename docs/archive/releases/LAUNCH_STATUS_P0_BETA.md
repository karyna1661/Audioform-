# Launch Status — P0 Beta

This is the **single source of truth** for launch readiness, progress, and remaining blockers for the P0 beta.

## Current status

- **Overall**: ✅ Ready to deploy (pending build + deploy validation)
- **Database**: ✅ Base schema executed + ✅ upload-pipeline migration executed
- **Confidence**: High (verify via smoke test after deploy)

## What’s implemented (P0 summary)

### Infrastructure
- **P0-1 Auth**: session cookie auth + OAuth integrations
- **P0-2 AuthZ**: server-side authorization checks on protected routes
- **P0-3 Database**: core tables + indexes + RLS
- **P0-8 Analytics**: backend ingestion + database persistence
- **P0-9 Ops**: env validation + middleware hardening

### User-facing
- **P0-4 Response inbox**: filtering + playback + moderation controls
- **P0-5 Classification**: duration seconds + duration bucket
- **P0-6 Moderation**: flag/high-signal/bookmark persisted
- **P0-7 Notifications**: digest plumbing + trigger points (SMTP optional)

## Recent critical upgrades

### Upload pipeline reliability (2-phase + idempotent)
- `response_records` supports `pending | uploaded | failed`
- `session_id` supports anon flows
- `idempotency_key` supports retry-safe uploads
- `upload_attempts` supports reconciling retry behavior
- `storage_file_id` enables cleanup for B2

DB migration executed: `database/migrations/2026-03-19_response_records_upload_pipeline.sql`

## Remaining blockers / verification

### Must-do
- **Deploy to Railway** and run the smoke test checklist.

### Optional
- Add background cleanup job for stale `pending` records and orphan cleanup.

## Canonical runbooks

- **Database (Supabase)**: `docs/DATABASE_SETUP_SUPABASE.md`
- **Deployment (Railway)**: `docs/DEPLOYMENT_P0_BETA.md`

## Quick verification queries (Supabase)

```sql
-- Recent responses (uploaded)
select id, status, created_at
from public.response_records
order by created_at desc
limit 20;
```

```sql
-- Pending records older than 5 minutes (should be 0 in healthy steady state)
select count(*) as stale_pending
from public.response_records
where status = 'pending'
  and created_at < now() - interval '5 minutes';
```

