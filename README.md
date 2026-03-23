# Audioform

Audioform is a voice-feedback platform for founders and product teams who want richer feedback than text forms can capture. Teams publish short voice surveys, collect spoken responses, and review higher-signal feedback with replayable context.

## Features

- Publish short voice surveys with builder-focused prompt guidance
- Collect spoken responses across desktop and mobile
- Review responses with playback, flagging, and high-signal triage
- Share surveys with social preview pages or embed them externally
- Track response activity across admin workflows

## Quick Start

```bash
npm install
npm run dev
```

Create a local `.env` first, then open the app in your browser.

## Environment Variables

Core app configuration:

- `AUTH_SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Production storage:

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_ID` or `B2_BUCKET_NAME`

Validate setup with:

```bash
npm run validate:env
```

## Deployment

Deployment and database setup live outside the root README to keep the public repo surface concise.

- `docs/internal/DEPLOYMENT_P0_BETA.md` - Railway deployment runbook
- `docs/internal/DATABASE_SETUP_SUPABASE.md` - Supabase schema and migration setup

## Architecture

- `app/admin/questionnaires/v1/page.tsx` - survey builder
- `app/questionnaire/v1/page.tsx` - respondent survey entry
- `app/questionnaire/v1/questionnaire-client.tsx` - respondent upload flow
- `app/admin/responses/page.tsx` - response inbox
- `app/share/survey/[surveyId]/page.tsx` - share landing page
- `app/api/responses/init` and `app/api/responses/upload` - 2-phase upload pipeline

## Scripts

- `npm run dev` - run local development
- `npm run build` - build for production
- `npm run start` - run production server
- `npm run verify` - type-check and runtime guards

## Documentation

- `docs/README.md` - documentation map
- `docs/product/QUESTION_INTELLIGENCE_SYSTEM.md` - builder prompt system
- `docs/product/USER_FLOW_WALKTHROUGH.md` - builder and respondent journeys
- `future-work/` - roadmap, GTM, and scalability planning

## Status

This repository contains the current Audioform beta codebase and a reduced documentation surface with product docs, internal runbooks, and archived operational history.
