create table if not exists public.response_transcripts (
  id uuid primary key default gen_random_uuid(),
  job_id text not null unique,
  response_id uuid references public.response_records(id) on delete cascade,
  question_id text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  transcript_text text,
  provider text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists response_transcripts_response_id_idx
  on public.response_transcripts (response_id);

create index if not exists response_transcripts_status_updated_at_idx
  on public.response_transcripts (status, updated_at desc);
