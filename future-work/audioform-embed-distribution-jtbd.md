# Audioform Embed Distribution JTBD

Last updated: 2026-03-03

## Primary Job To Be Done

When a builder is collecting feedback on a live page, they want to embed a 30-second voice survey directly on that page so they can capture high-intent signal without sending users off-site.

## Supporting Jobs

1. After publishing a survey, generate:
- Public survey link
- Iframe embed code
- Script embed code

2. Bind each embed to a decision target:
- messaging
- pricing
- trust
- feature scope
- onboarding friction

3. Keep prompt depth calibrated by surface intent:
- Landing: 1 prompt
- Sales: 2 prompts
- Beta/email: 3 prompts max

## Execution Phases

## Phase 1 (Shipped)

1. Public embed route:
- `/embed/[surveyId]`
- Embedded flow with 1-3 prompts
- Recorder -> playback -> submit
- Footer watermark: `Powered by Audioform`

2. Public survey endpoint:
- `GET /api/surveys/public/[id]`
- Returns only published survey data for embed rendering

3. Builder distribution output:
- Copy embed link
- Copy iframe snippet
- Copy script snippet

## Phase 2 (Next)

1. Surface-aware prompt calibration:
- `surface=landing|sales|beta|email|blog|personal`
- Auto-adjust prompt count and copy template by surface

2. Decision-target tagging:
- Require decision target at publish
- Persist in survey metadata

3. Embed analytics:
- `embed_loaded`
- `embed_recording_started`
- `embed_response_submitted`
- `embed_completion_rate`

## Phase 3 (Beta Proof Loop)

1. Dogfooding baseline:
- 15 responses before messaging update
- Track interpretation variance + confidence score

2. Messaging update

3. Post-update sample:
- 15 responses after update
- Compare variance drop + confidence rise

4. Weekly artifact:
- What we heard
- What we changed
- Which decision moved and why
