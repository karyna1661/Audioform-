-- Phase 1 scalability indexes
-- Align hot Supabase read/query patterns with composite and partial indexes.

create index if not exists surveys_created_by_updated_at_idx
  on public.surveys (created_by, updated_at desc);

create index if not exists response_records_uploaded_survey_created_at_idx
  on public.response_records (survey_id, created_at desc)
  where status = 'uploaded';

create index if not exists dashboard_events_survey_type_created_at_idx
  on public.dashboard_events (survey_id, type, created_at desc);

create index if not exists analytics_events_user_id_timestamp_idx
  on public.analytics_events (user_id, timestamp desc);

create index if not exists analytics_events_survey_id_timestamp_idx
  on public.analytics_events (survey_id, timestamp desc);

create index if not exists analytics_events_name_timestamp_idx
  on public.analytics_events (event_name, timestamp desc);
