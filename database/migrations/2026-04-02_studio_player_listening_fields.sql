-- ================================================================
-- AUDIOFORM: STUDIO + PLAYER LISTENING FIELDS
-- Date: 2026-04-02
-- ================================================================

alter table public.surveys
  add column if not exists public_listening_enabled boolean not null default false,
  add column if not exists closed_at timestamptz;

alter table public.surveys
  drop constraint if exists surveys_status_check;

alter table public.surveys
  add constraint surveys_status_check check (status in ('draft', 'published', 'live', 'closed'));

alter table public.response_records
  add column if not exists public_opt_in boolean not null default false,
  add column if not exists public_playlist_eligible boolean not null default false,
  add column if not exists listening_rank integer,
  add column if not exists preview_start_seconds integer,
  add column if not exists preview_end_seconds integer,
  add column if not exists hot_take text,
  add column if not exists momentum_tags text[] not null default '{}',
  add column if not exists collection_membership text[] not null default '{}',
  add column if not exists ep_inclusion boolean not null default false;

create index if not exists surveys_public_listening_idx
  on public.surveys (public_listening_enabled, status);

create index if not exists response_records_public_playlist_idx
  on public.response_records (survey_id, public_playlist_eligible, listening_rank desc, created_at desc);
