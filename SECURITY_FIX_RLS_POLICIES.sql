-- ================================================================
-- CRITICAL SECURITY PATCH: Enable Row-Level Security (RLS)
-- ================================================================
-- Run this IMMEDIATELY in your Supabase SQL Editor
-- This prevents the exact attack vector used on the Voice AI company
-- ================================================================

-- STEP 1: ENABLE RLS ON ALL TABLES
-- ================================================================
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

-- STEP 2: CREATE OWNERSHIP POLICIES FOR SURVEYS
-- ================================================================
-- Users can view their own surveys
CREATE POLICY "users_view_own_surveys"
ON surveys FOR SELECT
USING (auth.uid() = created_by);

-- Users can insert their own surveys
CREATE POLICY "users_insert_own_surveys"
ON surveys FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update their own surveys
CREATE POLICY "users_update_own_surveys"
ON surveys FOR UPDATE
USING (auth.uid() = created_by);

-- Users can delete their own surveys
CREATE POLICY "users_delete_own_surveys"
ON surveys FOR DELETE
USING (auth.uid() = created_by);

-- STEP 3: CREATE OWNERSHIP POLICIES FOR RESPONSES
-- ================================================================
-- Users can view responses to their own surveys only
CREATE POLICY "users_view_responses_to_own_surveys"
ON response_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = response_records.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- Anyone can submit responses to published surveys (for public submissions)
-- But only survey owner can view them
CREATE POLICY "anyone_submit_responses"
ON response_records FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = response_records.survey_id 
    AND surveys.status = 'published'
  )
);

-- Users can update responses to their own surveys (moderation)
CREATE POLICY "users_update_responses_to_own_surveys"
ON response_records FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = response_records.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- Users can delete responses to their own surveys
CREATE POLICY "users_delete_responses_to_own_surveys"
ON response_records FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = response_records.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- STEP 4: CREATE OWNERSHIP POLICIES FOR NOTIFICATION CONFIGS
-- ================================================================
-- Users can only view their own notification settings
CREATE POLICY "users_view_own_notifications"
ON notification_configs FOR SELECT
USING (auth.uid() = user_id);

-- Users can only update their own notification settings
CREATE POLICY "users_update_own_notifications"
ON notification_configs FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only insert their own notification settings
CREATE POLICY "users_insert_own_notifications"
ON notification_configs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- STEP 5: CREATE OWNERSHIP POLICIES FOR DASHBOARD EVENTS
-- ================================================================
-- Users can only view events for their own surveys
CREATE POLICY "users_view_own_dashboard_events"
ON dashboard_events FOR SELECT
USING (
  survey_id IS NULL OR
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = dashboard_events.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- System can insert any dashboard event
CREATE POLICY "system_insert_dashboard_events"
ON dashboard_events FOR INSERT
WITH CHECK (true);

-- Users can delete events from their own surveys
CREATE POLICY "users_delete_own_dashboard_events"
ON dashboard_events FOR DELETE
USING (
  survey_id IS NULL OR
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = dashboard_events.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- STEP 6: CREATE POLICIES FOR USERS TABLE
-- ================================================================
-- Users can view their own user record
CREATE POLICY "users_view_own_profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Admins can view all users (optional - remove if not needed)
-- CREATE POLICY "admins_view_all_users"
-- ON users FOR SELECT
-- USING (role = 'admin');

-- Users can update their own profile
CREATE POLICY "users_update_own_profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- STEP 7: CREATE POLICIES FOR SURVEY QUESTIONS
-- ================================================================
-- Users can view questions for their own surveys
CREATE POLICY "users_view_own_survey_questions"
ON survey_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = survey_questions.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- Users can manage questions for their own surveys
CREATE POLICY "users_manage_own_survey_questions"
ON survey_questions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM surveys 
    WHERE surveys.id = survey_questions.survey_id 
    AND surveys.created_by = auth.uid()
  )
);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these to confirm RLS is working:

-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'response_records', 'notification_configs', 'dashboard_events', 'users', 'survey_questions');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';

-- ================================================================
-- IMPORTANT NOTES
-- ================================================================
-- 1. These policies use auth.uid() which requires proper JWT authentication
-- 2. Your backend must use the ANON key (not SERVICE_ROLE) for RLS to apply
-- 3. If you need SERVICE_ROLE for specific operations, ensure ownership checks in code
-- 4. Test thoroughly in development before applying to production
-- ================================================================
