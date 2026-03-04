-- Audioform notification config table.
-- Run in Supabase SQL editor.

create table if not exists public.notification_configs (
  user_id text primary key,
  new_response boolean not null default true,
  completed_questionnaire boolean not null default true,
  daily_summary boolean not null default false,
  weekly_summary boolean not null default true,
  template_subject text not null default 'New response received',
  template_body text not null default 'A new response has been submitted to your questionnaire.',
  recipients jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists notification_configs_updated_at_idx on public.notification_configs (updated_at desc);

alter table public.notification_configs disable row level security;
