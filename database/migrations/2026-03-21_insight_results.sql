create table if not exists public.insight_results (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.response_transcripts(id) on delete cascade,
  response_id uuid references public.response_records(id) on delete cascade,
  summary text,
  primary_theme text,
  themes jsonb not null default '[]'::jsonb,
  sentiment text,
  sentiment_score numeric,
  signal_score integer,
  quotes jsonb not null default '[]'::jsonb,
  provider text,
  extractor_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transcript_id)
);

create index if not exists insight_results_response_id_idx
  on public.insight_results (response_id);

create index if not exists insight_results_primary_theme_idx
  on public.insight_results (primary_theme);

create index if not exists insight_results_signal_score_idx
  on public.insight_results (signal_score desc);
