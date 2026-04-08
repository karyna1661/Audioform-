-- ================================================================
-- AUDIOFORM: DECISION-GRADE INSIGHT ENGINE V3
-- Date: 2026-04-05
-- ================================================================

alter table public.insight_results
  add column if not exists narrative_summary text,
  add column if not exists signal_summary jsonb not null default '{}'::jsonb,
  add column if not exists power_quote text,
  add column if not exists quote_candidates jsonb not null default '[]'::jsonb;

update public.insight_results
set
  narrative_summary = coalesce(narrative_summary, summary),
  power_quote = coalesce(power_quote, nullif((quotes ->> 0), ''))
where narrative_summary is null
   or power_quote is null;

create table if not exists public.release_insights (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null references public.surveys(id) on delete cascade,
  narrative_summary text,
  signal_summary jsonb not null default '{}'::jsonb,
  clusters jsonb not null default '[]'::jsonb,
  share_artifacts jsonb not null default '{}'::jsonb,
  provider text,
  extractor_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (survey_id)
);

create index if not exists release_insights_survey_id_idx
  on public.release_insights (survey_id);

