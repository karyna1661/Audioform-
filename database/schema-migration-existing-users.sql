-- ================================================================
-- AUDIOFORM MIGRATION SCHEMA - FOR EXISTING USERS TABLE
-- ================================================================
-- Use this when users table already exists with RLS enabled
-- This skips users table creation and users policies
-- ================================================================

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
  user_id text not null references public.users(id),
  file_name text not null,
  mime_type text not null,
  size integer not null check (size >= 0),
  storage_path text not null,
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
-- 7. ANALYTICS EVENTS TABLE
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- Enable RLS on NEW tables only (users already done)
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.response_records enable row level security;
alter table public.dashboard_events enable row level security;
alter table public.notification_configs enable row level security;
alter table public.analytics_events enable row level security;

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
-- VERIFICATION
-- ================================================================
-- Check all tables exist
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'surveys', 'survey_questions',
  'response_records', 'dashboard_events',
  'notification_configs', 'analytics_events'
);

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
