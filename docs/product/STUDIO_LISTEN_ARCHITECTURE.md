# Studio + Listen Architecture

## Overview

Audioform now centers the product around two creator modes:

- `Studio`: shape prompts, publish releases, and control public listening
- `Listen`: hear ranked takes first, review transcript and AI summaries, and moderate what moves forward

This document is the current source of truth for how those surfaces fit together.

## Route Model

### Creator routes

- `/admin/dashboard/v4`
  - primary `Listen` home
  - ranked releases and cross-release starter pack
  - persistent listening session stays alive across admin routes

- `/admin/questionnaires/v1`
  - `Studio`
  - prompt shaping, release setup, and public-listening toggle

- `/admin/responses`
  - global release listening surface
  - starter pack and release library

- `/admin/responses?surveyId=<id>`
  - one-release listening page
  - release player, starter pack, release snapshot, and Take Deck
  - release player can collapse to reveal the release library without leaving the route

- `/admin/share`
  - distribution hub
  - QR and social share flows are distinct and source-aware

### Respondent routes

- `/share/survey/[surveyId]`
  - public release landing for shared links
  - source-aware copy uses `Hear. Speak. Join.` for social links

- `/questionnaire/v1?surveyId=<id>`
  - respondent recording flow
  - source-aware framing:
    - `src=qr` -> `Scan. Speak. Listen.`
    - `src=social` -> `Hear. Speak. Join.`
    - missing source -> neutral voice-response framing

- `/questionnaire/thank-you`
  - thank-you state varies by:
    - arrival source
    - private vs public listening
    - public room ready vs public room still filling

## Listening System

### Shared session

`components/listen/listening-session-provider.tsx` owns:

- queue
- selected track
- play/pause/next state
- preview vs full mode
- persistent dock state
- timeline telemetry

This is the single source of truth for admin-side playback.

### Release player

`components/listen/audio-sequence-player.tsx` is the momentum surface.

Its job is to:

- start the right take immediately on click
- keep creators in a hook-first listening loop
- surface progress, elapsed time, and duration clearly

### Take Deck

`components/release-take-deck.tsx` is the interpretation surface.

Its job is to:

- keep transcript and AI summary review close to playback
- avoid falling back into an archive-first inbox model
- support moderation actions on the same card

## Insight Model

Insight extraction now treats these outputs as different jobs:

- `summary`
  - short synthesis of what the responder means
- `primaryTheme`
  - topic label
- `quotes[0]`
  - best verbatim excerpt
- `hotTake`
  - listening-oriented hook for player surfaces

The worker and server extractor both follow this split so the same transcript is not reused as summary, quote, and player hook.

## Share Model

Audioform uses explicit source markers in URLs:

- social preview links -> `src=social`
- QR/live survey links -> `src=qr`

This keeps copy and thank-you behavior honest without relying on referrer detection.

### QR path

- in-person and event handoff
- `Scan. Speak. Listen.`
- QR points directly into the live survey

### Social path

- conversation invite
- `Hear. Speak. Join.`
- shared card points to the release landing first, then preserves source into the survey flow

## Cleanup Notes

The old redesign lab and experimental homepage study routes are no longer part of the active product surface and have been removed from the live repo path.

The product should now be understood through the Studio + Listen architecture above, not through legacy redesign comparison routes.
