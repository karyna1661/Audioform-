# Audioform

Audioform is a voice feedback platform for builders who ship in public. It helps teams publish short voice surveys, collect spoken responses, and review higher-signal feedback with more context than text forms.

## What It Does

- Create and publish voice surveys with builder-focused prompt templates
- Collect spoken responses from desktop and mobile respondents
- Store and review responses with replay, moderation, and bookmarking workflows
- Share surveys directly or embed them in external sites
- Track survey and response activity across admin surfaces

## Product Direction

Audioform is built around one idea: better questions create better voice responses, which creates better product decisions.

The current product focuses on:

- decision-ready feedback loops
- short, high-signal question sets
- replayable response review for builders
- AI-optional workflows now, with AI-assisted insight extraction later

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- Supabase REST-backed persistence for surveys and responses
- Backblaze B2 for production audio storage when configured
- Remotion for video/demo rendering workflows

## Core App Areas

- `app/admin/questionnaires/v1/page.tsx` - survey creation flow
- `app/questionnaire/v1/page.tsx` - respondent voice survey flow
- `app/admin/responses/page.tsx` - response review experience
- `app/api/surveys` - survey CRUD and publishing
- `app/api/responses/init` and `app/api/responses/upload` - 2-phase response upload pipeline
- `lib/server/response-store.ts` - response persistence and storage coordination

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create a local `.env` with the required variables.

3. Start the app:

```bash
npm run dev
```

4. Open the app in your browser.

## Important Environment Variables

Required for core app behavior:

- `AUTH_SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Used for integrations and production workflows:

- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET_ID` or `B2_BUCKET_NAME`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APIFY_TOKEN`
- `NEXT_PUBLIC_AUDIOFORM_FEEDBACK_SURVEY_ID`

Optional right now:

- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_VERIFICATION_KEY`

Validate env setup with:

```bash
npm run validate:env
```

## Scripts

- `npm run dev` - validate env and run local development server
- `npm run build` - validate env and create a production build
- `npm run start` - run the production server
- `npm run verify` - runtime guard, secret guard, and TypeScript check
- `npm run gtm:brief` - generate weekly GTM brief
- `npm run video:preview` - open Remotion studio

## Upload Pipeline

Respondent audio now uses a 2-phase flow:

1. `POST /api/responses/init` creates a pending `response_records` row
2. `POST /api/responses/upload` uploads audio and finalizes the record

In development, audio files are written to `uploads/audio-responses/`.
In production, audio can be stored in Backblaze B2 when configured.

## Documentation Map

Start here:

- `README_DOCUMENTATION.md` - documentation index
- `QUICK_START_GUIDE.md` - operator walkthrough
- `BUILD_SUMMARY.md` - implementation and architecture summary
- `USER_FLOW_WALKTHROUGH.md` - builder and respondent journeys
- `future-work/` - roadmap, GTM, and scalability planning

## Current Status

The repo contains active product code, deployment notes, migration files, and future planning docs. Some historical docs remain in the root for reference, so treat `future-work/` and current route files as the best source of truth for product direction.
