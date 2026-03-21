# Audioform

Audioform is a voice feedback platform for founders and product teams who want richer feedback than forms can capture. Teams publish short voice surveys, collect spoken responses, and review signal faster with replayable context.

## Features

- Publish short voice surveys with builder-focused prompt guidance
- Collect spoken responses across desktop and mobile
- Review responses with playback, flagging, and high-signal triage
- Share surveys with rich social previews or embed them on external sites
- Track response activity across admin dashboards

## Product Focus

Audioform is built around one core loop:

1. Ask a better prompt
2. Capture a spoken response
3. Replay the exact customer moment
4. Decide what to improve next

The product currently emphasizes short prompt sets, first-response speed, and decision-ready feedback loops.

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- Supabase-backed persistence for surveys and responses
- Backblaze B2 for production audio storage

## Core App Areas

- `app/admin/questionnaires/v1/page.tsx` - survey builder
- `app/questionnaire/v1/page.tsx` - respondent survey entry
- `app/questionnaire/v1/questionnaire-client.tsx` - respondent upload and completion flow
- `app/admin/responses/page.tsx` - response inbox
- `app/share/survey/[surveyId]/page.tsx` - social share landing page
- `app/api/responses/init` + `app/api/responses/upload` - 2-phase upload pipeline

## Quick Start

```bash
npm install
npm run dev
```

Create a local `.env` first, then open the app in your browser.

## Required Environment Variables

Core:

- `AUTH_SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Storage / integrations:

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_ID` or `B2_BUCKET_NAME`

Validate environment setup with:

```bash
npm run validate:env
```

## Useful Scripts

- `npm run dev` - run local development
- `npm run build` - build for production
- `npm run start` - run production server
- `npm run verify` - type-check and runtime guards

## Documentation

- `docs/README.md` - documentation index
- `docs/product/QUESTION_INTELLIGENCE_SYSTEM.md` - builder prompt system
- `docs/product/USER_FLOW_WALKTHROUGH.md` - builder and respondent journeys
- `docs/internal/DEPLOYMENT_P0_BETA.md` - deployment runbook
- `future-work/` - roadmap, GTM, and scalability planning

## Status

The repository contains the current beta candidate of Audioform plus supporting docs for product, deployment, and future planning.
