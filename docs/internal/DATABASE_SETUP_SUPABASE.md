# Supabase Database Setup (Production)

This is the **single source of truth** for setting up Audioform’s database in Supabase.

## What you’ll run

- **Base schema**: `database/schema-production.sql`
- **Migrations (if any)**: `database/migrations/*.sql` (run in chronological order)

## Execute base schema (first-time setup)

1. Open Supabase project → **SQL Editor** → **New query**
2. Copy/paste the full contents of `database/schema-production.sql`
3. Click **Run**

### Verify tables + RLS

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'users','surveys','survey_questions',
    'response_records','dashboard_events',
    'notification_configs','analytics_events'
  );
```

Expected: all rows show `rowsecurity = true`.

## Run migrations (production upgrades)

When shipping schema upgrades to production, run the migration SQL files in Supabase SQL editor (in order). Example:

- `database/migrations/2026-03-19_response_records_upload_pipeline.sql`

### Post-migration verification (recommended)

```sql
-- Verify upload pipeline columns exist
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'response_records'
  and column_name in ('status','session_id','idempotency_key','upload_attempts','storage_file_id');
```

## Troubleshooting

- **“relation already exists”**: safe; schema uses `if not exists`.
- **Partial run**: re-run; it’s designed to be idempotent.
- **Permission errors**: ensure you’re using the Supabase project owner account (running SQL in dashboard).

