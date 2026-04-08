-- ================================================================
-- AUDIOFORM PRODUCTION DATABASE SCHEMA
-- Run this in Supabase SQL Editor to set up all required tables
-- ================================================================

-- Enable UUID extension
create extension if not exists pgcrypto;

-- ================================================================
-- 1. USERS TABLE
-- ================================================================
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_role_idx on public.users (role);

-- ================================================================
-- 2. SURVEYS TABLE
-- ================================================================
create table if not exists public.surveys (
  id text primary key,
  title text not null,
  decision_focus text,
  intent text,
  template_pack text,
  question_count integer not null default 0 check (question_count >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by text not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  public_listening_enabled boolean not null default false,
  closed_at timestamptz
);

create index if not exists surveys_status_idx on public.surveys (status);
create index if not exists surveys_created_by_idx on public.surveys (created_by);
create index if not exists surveys_updated_at_idx on public.surveys (updated_at desc);

-- ================================================================
-- 3. SURVEY QUESTIONS TABLE
-- ================================================================
create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null references public.surveys(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'open_ended',
  order_index integer not null default 0,
  audio_prompt text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists survey_questions_survey_id_idx on public.survey_questions (survey_id);
create index if not exists survey_questions_order_idx on public.survey_questions (survey_id, order_index);

-- ================================================================
-- 4. RESPONSE RECORDS TABLE
-- ================================================================
create table if not exists public.response_records (
  id uuid primary key,
  survey_id text not null references public.surveys(id) on delete cascade,
  question_id text not null,
  -- user_id is optional to support anon submissions (tracked by session_id)
  user_id text references public.users(id),
  -- upload pipeline fields (2-phase + retry-safe)
  session_id text not null,
  status text not null default 'pending' check (status in ('pending','uploaded','failed')),
  upload_attempts integer not null default 0 check (upload_attempts >= 0),
  idempotency_key text not null unique,
  -- storage metadata is nullable until status='uploaded'
  file_name text,
  mime_type text,
  size integer check (size is null or size >= 0),
  storage_path text,
  storage_file_id text,
  public_url text,
  duration_seconds integer,
  duration_bucket text check (duration_bucket in ('short', 'medium', 'deep')),
  flagged boolean not null default false,
  high_signal boolean not null default false,
  bookmarked boolean not null default false,
  public_opt_in boolean not null default false,
  public_playlist_eligible boolean not null default false,
  listening_rank integer,
  preview_start_seconds integer,
  preview_end_seconds integer,
  hot_take text,
  momentum_tags text[] not null default '{}',
  collection_membership text[] not null default '{}',
  ep_inclusion boolean not null default false,
  moderation_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists response_records_survey_id_idx on public.response_records (survey_id);
create index if not exists response_records_question_id_idx on public.response_records (question_id);
create index if not exists response_records_user_id_idx on public.response_records (user_id);
create index if not exists response_records_session_id_idx on public.response_records (session_id);
create index if not exists response_records_status_idx on public.response_records (status);
create index if not exists response_records_created_at_idx on public.response_records (created_at desc);
create index if not exists response_records_duration_bucket_idx on public.response_records (duration_bucket);
create index if not exists response_records_flagged_idx on public.response_records (flagged);
create index if not exists response_records_high_signal_idx on public.response_records (high_signal);
create index if not exists response_records_bookmarked_idx on public.response_records (bookmarked);

-- ================================================================
-- 5. DASHBOARD EVENTS TABLE
-- ================================================================
create table if not exists public.dashboard_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  survey_id text references public.surveys(id) on delete cascade,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dashboard_events_type_idx on public.dashboard_events (type);
create index if not exists dashboard_events_survey_id_idx on public.dashboard_events (survey_id);
create index if not exists dashboard_events_created_at_idx on public.dashboard_events (created_at desc);

-- ================================================================
-- 6. NOTIFICATION CONFIGS TABLE
-- ================================================================
create table if not exists public.notification_configs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique references public.users(id) on delete cascade,
  enabled boolean not null default true,
  email_recipients text[] not null default '{}',
  response_threshold integer not null default 1,
  digest_frequency text not null default 'immediate' check (digest_frequency in ('immediate', 'hourly', 'daily', 'weekly')),
  templates jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_configs_user_id_idx on public.notification_configs (user_id);

-- ================================================================
-- 7. ANALYTICS EVENTS TABLE (for P0-8)
-- ================================================================
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id text references public.users(id),
  survey_id text references public.surveys(id),
  response_id uuid references public.response_records(id),
  event_data jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists analytics_events_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);
create index if not exists analytics_events_survey_id_idx on public.analytics_events (survey_id);
create index if not exists analytics_events_timestamp_idx on public.analytics_events (timestamp desc);

-- ================================================================
-- 8. RESPONSE TRANSCRIPTS + INSIGHTS
-- ================================================================
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

create table if not exists public.insight_results (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.response_transcripts(id) on delete cascade,
  response_id uuid references public.response_records(id) on delete cascade,
  summary text,
  narrative_summary text,
  signal_summary jsonb not null default '{}'::jsonb,
  power_quote text,
  primary_theme text,
  themes jsonb not null default '[]'::jsonb,
  sentiment text,
  sentiment_score numeric,
  signal_score integer,
  quotes jsonb not null default '[]'::jsonb,
  quote_candidates jsonb not null default '[]'::jsonb,
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

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.response_records enable row level security;
alter table public.dashboard_events enable row level security;
alter table public.notification_configs enable row level security;
alter table public.analytics_events enable row level security;

-- Users policies
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_self" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Surveys policies
CREATE POLICY "users_view_own_surveys" ON public.surveys FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "users_create_surveys" ON public.surveys FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "users_update_own_surveys" ON public.surveys FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "users_delete_own_surveys" ON public.surveys FOR DELETE USING (auth.uid() = created_by);

-- Survey questions policies
CREATE POLICY "users_view_own_survey_questions" ON public.survey_questions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = survey_questions.survey_id 
    AND surveys.created_by = auth.uid()
  )
);
CREATE POLICY "users_manage_own_survey_questions" ON public.survey_questions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = survey_questions.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- Response records policies
CREATE POLICY "users_view_responses_to_own_surveys" ON public.response_records FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = response_records.survey_id 
    AND surveys.created_by = auth.uid()
  )
);
CREATE POLICY "anyone_submit_responses" ON public.response_records FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = response_records.survey_id 
    AND surveys.status = 'published'
  )
);
CREATE POLICY "users_update_responses_to_own_surveys" ON public.response_records FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = response_records.survey_id 
    AND surveys.created_by = auth.uid()
  )
);
CREATE POLICY "users_delete_responses_to_own_surveys" ON public.response_records FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = response_records.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- Dashboard events policies
CREATE POLICY "users_view_own_dashboard_events" ON public.dashboard_events FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = dashboard_events.survey_id 
    AND surveys.created_by = auth.uid()
  )
);
CREATE POLICY "users_create_own_dashboard_events" ON public.dashboard_events FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = dashboard_events.survey_id 
    AND surveys.created_by = auth.uid()
  ) OR auth.uid() IS NULL -- Allow system events
);

-- Notification configs policies
CREATE POLICY "users_view_own_notification_configs" ON public.notification_configs FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "users_manage_own_notification_configs" ON public.notification_configs FOR ALL 
USING (auth.uid() = user_id);

-- Analytics events policies
CREATE POLICY "users_view_own_analytics_events" ON public.analytics_events FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE surveys.id = analytics_events.survey_id 
    AND surveys.created_by = auth.uid()
  )
);
CREATE POLICY "users_create_analytics_events" ON public.analytics_events FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'surveys', 'survey_questions', 'response_records', 'dashboard_events', 'notification_configs', 'analytics_events');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- SAMPLE DATA FOR TESTING (Optional - remove in production)
-- ================================================================
-- Uncomment to insert test data:
/*
INSERT INTO public.users (id, name, email, role, password_hash, password_salt) VALUES
('test-user-1', 'Test User', 'test@audioform.local', 'admin', 'hash_placeholder', 'salt_placeholder');
*/
