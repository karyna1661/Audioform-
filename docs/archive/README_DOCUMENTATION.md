# Audioform Documentation Index

This file points to the main documentation in the repository and gives a practical reading order.

## Start Here

- `README.md` - project overview, setup, scripts, and architecture map
- `QUICK_START_GUIDE.md` - fast operator guide for creating, publishing, and reviewing surveys
- `BUILD_SUMMARY.md` - broader implementation snapshot and stack overview

## Product and User Flows

- `USER_FLOW_WALKTHROUGH.md` - end-to-end builder and respondent journeys
- `QUESTION_INTELLIGENCE_SYSTEM.md` - question-quality system and prompt design rationale
- `SURVEY_QUALITY_ENHANCEMENT_SUMMARY.md` - survey quality improvements and publishing guidance

## Security and Operations

- `SECURITY_AUDIT_COMPLETE.md` - security posture and secret-handling review
- `RAILWAY_SECURITY_VERIFICATION.md` - deployment security checks
- `VERCEL_ENV_VAR_MISMATCH.md` - environment mismatch notes
- `RAILWAY_LOGIN_FIX.md` - deployment/login troubleshooting history

## Data and Backend

- `database/schema-production.sql` - production schema reference
- `database/migrations/2026-03-19_response_records_upload_pipeline.sql` - response upload pipeline migration
- `future-work/supabase-auth-setup.sql` - auth setup reference
- `future-work/supabase-response-records-setup.sql` - response records setup reference
- `future-work/supabase-surveys-dashboard-setup.sql` - surveys/dashboard setup reference
- `future-work/supabase-notifications-setup.sql` - notifications setup reference

## Strategy and Planning

- `future-work/AUDIOFORM_COMPREHENSIVE_ROADMAP.md` - product roadmap
- `future-work/EXECUTIVE_SYNTHESIS_SUMMARY.md` - high-level strategy summary
- `future-work/audioform-first-principles-redesign-spec.md` - product and UX principles
- `future-work/audioform-gtm-90-day-sprint-board.md` - go-to-market execution board
- `future-work/README_SCALABILITY_INITIATIVE.md` - scalability planning entry point

## Recommended Reading Order

If you are new to the repo:

1. `README.md`
2. `QUICK_START_GUIDE.md`
3. `USER_FLOW_WALKTHROUGH.md`
4. `BUILD_SUMMARY.md`
5. `future-work/EXECUTIVE_SYNTHESIS_SUMMARY.md`

If you are debugging uploads or persistence:

1. `app/questionnaire/v1/page.tsx`
2. `app/api/responses/init/route.ts`
3. `app/api/responses/upload/route.ts`
4. `lib/server/response-store.ts`
5. `database/migrations/2026-03-19_response_records_upload_pipeline.sql`

If you are planning product work:

1. `future-work/audioform-first-principles-redesign-spec.md`
2. `future-work/AUDIOFORM_COMPREHENSIVE_ROADMAP.md`
3. `future-work/audioform-gtm-90-day-sprint-board.md`
4. `future-work/README_SCALABILITY_INITIATIVE.md`

## Notes

- Some root-level markdown files are historical implementation logs and fix summaries.
- For current product behavior, prefer route files under `app/`, server code under `lib/server/`, and the documents listed above.
