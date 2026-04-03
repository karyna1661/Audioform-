# Audioform

Audioform is a voice-feedback product built around two linked creator surfaces:

- `Studio` for shaping prompts and publishing releases
- `Listen` for hearing ranked takes, reviewing transcripts, and pulling signal forward

Respondents answer by voice, creators review the strongest takes first, and public listening can unlock a responder-side player when a release allows it.

## Core Product

- Build and publish releases in `Studio`
- Listen through ranked takes in `Listen`
- Review transcript, AI summary, and moderation actions in the `Take Deck`
- Share releases through source-aware QR and social flows
- Unlock responder listening rooms when public listening is enabled

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

## Product Surfaces

- `app/admin/dashboard/v4/page.tsx` - creator Listen home
- `app/admin/questionnaires/v1/page.tsx` - creator Studio
- `app/admin/responses/page.tsx` - release listening, take review, and moderation
- `app/questionnaire/v1/questionnaire-client.tsx` - respondent voice flow
- `app/questionnaire/thank-you/page.tsx` - responder completion and player unlock
- `app/share/survey/[surveyId]/page.tsx` - public release landing for shared links

## Architecture

- `components/listen/` - shared listening session, release player, and persistent dock
- `components/release-take-deck.tsx` - transcript and AI-summary review surface
- `lib/listening-model.ts` - release ranking, preview clip, hot take, and momentum logic
- `app/api/responses/init` and `app/api/responses/upload` - 2-phase upload pipeline
- `scripts/process-job-queue.mjs` - async transcription and insight extraction worker

## Scripts

- `npm run dev` - run local development
- `npm run build` - build for production
- `npm run start` - run production server
- `npm run verify` - type-check and runtime guards

## Documentation

- `docs/README.md` - documentation map
- `docs/product/STUDIO_LISTEN_ARCHITECTURE.md` - current product architecture and route model
- `docs/product/QUESTION_INTELLIGENCE_SYSTEM.md` - builder prompt system
- `docs/product/USER_FLOW_WALKTHROUGH.md` - builder and respondent journeys
- `future-work/` - roadmap, GTM, and scalability planning

## Status

This repository contains the current Audioform beta codebase and a reduced documentation surface with product docs, internal runbooks, and archived operational history.
