-- Audioform survey + dashboard activity tables.
-- Run in Supabase SQL editor after auth table setup.

create extension if not exists pgcrypto;

create table if not exists public.surveys (
  id text primary key,
  title text not null,
  decision_focus text,
  intent text,
  template_pack text,
  question_count integer not null default 0 check (question_count >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists surveys_status_idx on public.surveys (status);
create index if not exists surveys_created_by_idx on public.surveys (created_by);
create index if not exists surveys_updated_at_idx on public.surveys (updated_at desc);

create table if not exists public.dashboard_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  survey_id text,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dashboard_events_type_idx on public.dashboard_events (type);
create index if not exists dashboard_events_survey_id_idx on public.dashboard_events (survey_id);
create index if not exists dashboard_events_created_at_idx on public.dashboard_events (created_at desc);

alter table public.surveys disable row level security;
alter table public.dashboard_events disable row level security;
