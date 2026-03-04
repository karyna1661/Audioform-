-- Audioform response metadata + moderation table.
-- Run in Supabase SQL editor.

create table if not exists public.response_records (
  id uuid primary key,
  survey_id text not null,
  question_id text not null,
  user_id text not null,
  file_name text not null,
  mime_type text not null,
  size integer not null check (size >= 0),
  storage_path text not null,
  public_url text,
  flagged boolean not null default false,
  high_signal boolean not null default false,
  bookmarked boolean not null default false,
  moderation_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists response_records_survey_id_idx on public.response_records (survey_id);
create index if not exists response_records_question_id_idx on public.response_records (question_id);
create index if not exists response_records_user_id_idx on public.response_records (user_id);
create index if not exists response_records_created_at_idx on public.response_records (created_at desc);

alter table public.response_records disable row level security;
