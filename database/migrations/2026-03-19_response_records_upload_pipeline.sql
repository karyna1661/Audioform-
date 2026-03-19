-- ================================================================
-- AUDIOFORM: PRODUCTION-GRADE UPLOAD PIPELINE (2-PHASE + IDEMPOTENCY)
-- Date: 2026-03-19
--
-- Goal:
-- - Allow creating a "pending" response record before upload
-- - Support retry-safe uploads via idempotency_key
-- - Support anon users via session_id (cookie-backed)
-- - Track attempts and enable cleanup/reconciliation
-- ================================================================

-- 1) Add new columns (safe, additive)
alter table public.response_records
  add column if not exists status text not null default 'uploaded'
    check (status in ('pending','uploaded','failed')),
  add column if not exists session_id text,
  add column if not exists upload_attempts integer not null default 0 check (upload_attempts >= 0),
  add column if not exists idempotency_key text,
  add column if not exists storage_file_id text;

-- 2) Relax non-atomic fields so INIT can insert "pending" rows.
--    (We keep the integrity by requiring these fields once status='uploaded' at the application layer.)
alter table public.response_records
  alter column user_id drop not null,
  alter column file_name drop not null,
  alter column mime_type drop not null,
  alter column size drop not null,
  alter column storage_path drop not null;

-- Keep size constraint meaningful when present
alter table public.response_records
  drop constraint if exists response_records_size_check;
alter table public.response_records
  add constraint response_records_size_check check (size is null or size >= 0);

-- 3) Backfill session_id + idempotency_key for existing rows (best-effort).
--    Existing records become retry-safe and remain 'uploaded'.
update public.response_records
set session_id = coalesce(session_id, 'legacy-' || encode(gen_random_bytes(12), 'hex'))
where session_id is null;

update public.response_records
set idempotency_key = coalesce(idempotency_key, 'legacy-' || encode(gen_random_bytes(12), 'hex'))
where idempotency_key is null;

-- 4) Indexes / constraints for performance + idempotency guarantees
create unique index if not exists response_records_idempotency_key_uq on public.response_records (idempotency_key);
create index if not exists response_records_status_idx on public.response_records (status);
create index if not exists response_records_session_id_idx on public.response_records (session_id);

-- 5) Optional: handy view for ops/debug (safe to skip)
-- create view public.response_records_pending as
--   select * from public.response_records where status='pending';

