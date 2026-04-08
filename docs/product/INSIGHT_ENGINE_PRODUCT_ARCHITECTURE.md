# Audioform Insight Engine Product Architecture

## One-line vision

Audioform is a creator listening system that converts many voice takes into ranked playback, clustered intelligence, and shareable signal artifacts.

## Purpose

This document explains the product architecture behind Audioform's Studio + Listen model, with a focus on the insight engine that powers response review, release intelligence, and sharing.

The aim is not just to collect voice responses. The aim is to help a creator:

- hear what matters first
- understand what is emerging across many responses
- turn raw voice into decisions
- turn strong signal into artifacts worth sharing

## User model

### Creator

The creator is the primary operator of the system.

The creator uses:

- `Studio` to shape prompts and publish a release
- `Listen` to hear ranked takes, review transcript and insight layers, and identify signal
- `Share` to distribute the release through QR and social surfaces

The creator's core needs are:

- get honest voice input quickly
- avoid drowning in raw responses
- hear strongest takes first
- understand patterns across many takes
- extract insight that can drive product, research, or messaging decisions

### Responder

The responder contributes a voice take to a release.

The responder uses:

- the public release/share page to understand the prompt context
- the recording flow to submit a take
- the thank-you/player flow to optionally hear other responses when public listening is enabled

The responder's role is to add signal, not to manage it.

### Release as the shared object

A release is the product object that connects creator and responder behavior.

A release is:

- a published prompt set
- a container for many voice takes
- a listening surface
- a signal container
- a shareable conversational object

## Data model

### Core entities

#### Survey / Release

In the product experience, a published survey behaves like a release.

A release contains:

- metadata such as title and creator
- prompt questions
- public listening configuration
- many response takes

#### Response / Take

A response is a single recorded voice take submitted to a release.

A take contains:

- raw audio
- metadata such as duration and timestamp
- moderation state
- listening rank and preview clip information
- transcript
- response-level insight

### Response insight model

The response insight model powers the Take Deck and listening surfaces.

Each enriched response may contain:

- `narrativeSummary`
  a short human-readable synthesis of what the responder means
- `signalSummary`
  structured intelligence such as:
  - `complaint`
  - `opportunity`
  - `emotion`
  - `frictionMoment`
  - `confidence`
- `powerQuote`
  the best verbatim line worth carrying in the UI
- `verbatimQuotes`
  ranked verbatim quote candidates
- `quoteCandidates`
  internal scoring metadata for quote ranking
- `primaryTheme`
  the strongest topic label
- `themes`
  supporting topic labels
- `signalScore`
  signal strength for ranking and prioritization
- `sentiment`
- `sentimentScore`
- `provider`
- `extractorVersion`

Important semantic rules:

- `powerQuote` must remain verbatim
- `narrativeSummary` must not simply restate the transcript
- `signalSummary` is structured intelligence, not marketing prose
- `hotTake` is a listening artifact derived from this layer, not the same thing as the summary or quote

### Release insight model

The release insight model sits above individual responses.

It represents clustered intelligence across many enriched takes in one release.

Each release insight may contain:

- `narrativeSummary`
  the release-level synthesis
- `signalSummary`
  with:
  - `topComplaints`
  - `topOpportunities`
  - `emergingSignals`
  - `contrarianInsights`
- `clusters`
  where each cluster includes:
  - `label`
  - `count`
  - `description`
  - `representativeResponseIds`
  - `representativeQuote`
  - `representativeTakeId`
- `shareArtifacts`
  with:
  - `topQuotes`
  - `bestClusterLabel`
  - `bestClipCandidateIds`
- `provider`
- `extractorVersion`

Important semantic rules:

- complaints should be grouped, not repeated verbatim across rows
- opportunities should express solution direction, not just restate pain
- emerging signals should represent low-frequency but high-upside patterns
- contrarian insights should preserve minority viewpoints when they are sharp enough to matter

## Pipeline

### End-to-end flow

The system runs as a layered pipeline:

1. a responder submits an audio take
2. the audio is stored against the response record
3. a transcript is created
4. response-level insight is extracted from the transcript
5. release-level insight is recomputed from enriched responses
6. creator-facing listening and review surfaces read those stored artifacts
7. share surfaces use selected artifacts for public presentation

### Response pipeline

The response pipeline is responsible for turning one transcript into one usable review object.

It currently produces:

- narrative summary
- structured signal summary
- verbatim quote candidates
- selected power quote
- themes
- sentiment
- signal score

This response layer is what powers:

- take cards
- quote moments
- narrative summaries
- player hooks
- ranking support

### Release aggregation pipeline

The release aggregation pipeline consumes enriched responses, not raw audio blobs.

Its job is to answer:

- what is repeating?
- what is worth hearing first?
- what opportunity is emerging?
- where is the minority view?
- which take best represents each cluster?

Its outputs are used for:

- release decision board
- clustered complaint and opportunity panels
- representative takes
- shareable release-level artifacts

### Queue and regeneration behavior

The system is designed to work both on new incoming takes and on historical backfill.

Operationally, this means:

- new responses should flow through transcript and response insight extraction automatically
- release insights should refresh whenever newly enriched responses land
- historical data should be regenerated when the extractor version changes materially

## UI surfaces

### Studio

Studio is the creation surface.

Its role is to:

- shape prompts
- publish releases
- control the conditions under which takes arrive

Studio is not where insight is primarily consumed.

### Listen

Listen is the primary creator consumption surface.

Its job is to:

- rank takes
- keep creators in playback flow
- provide fast access to interpretation and moderation

Listen includes multiple layers:

#### Starter pack

The starter pack is the cross-release top-listening layer.

Its purpose is:

- surface the strongest takes across active releases
- reduce decision cost
- give the creator a fast starting point

#### Release player

The release player is the momentum engine for one release.

Its job is:

- keep playback fluid
- surface strongest hooks first
- help the creator hear before over-analyzing

#### Take Deck

The Take Deck is the interpretation layer.

Its job is:

- connect audio, quote, narrative summary, transcript, and signal
- let creators inspect one take more deliberately
- support actions such as save, flag, and mark high signal

#### Release decision board

The release decision board is the release-level intelligence layer.

Its job is:

- synthesize many takes into grouped product signal
- show top complaints and top opportunities
- surface emerging and contrarian viewpoints
- anchor clusters to representative quotes and takes

### Share surfaces

Share surfaces are how a release leaves the creator workspace.

They use:

- first prompt preview
- share-ready quotes
- release narrative framing
- source-aware entry paths for QR and social links

These surfaces should never misrepresent rewritten AI language as if it were spoken verbatim.

### Respondent surfaces

Respondent surfaces include:

- public release/share page
- recording flow
- thank-you flow
- responder listening/player unlock when enabled

These surfaces are downstream of the insight engine, but they are not its primary consumers.

## Jobs to be done

### Core product job

When a creator opens a release, help them hear what matters first, understand what patterns are emerging, and turn raw voice into decisions and shareable signal artifacts.

### Listening job

When I have many takes, help me start with the strongest ones so I do not waste time digging blindly.

### Interpretation job

When I hear a take worth inspecting, help me quickly understand what it means without forcing me to parse the entire transcript first.

### Synthesis job

When many people respond, help me see what is repeating, what opportunity is implied, and where minority viewpoints diverge.

### Sharing job

When I find a strong signal, help me turn it into a quote, cluster, or release-level artifact that can be shared responsibly.

### Trust job

When AI is involved, keep the product honest by separating:

- verbatim quote
- narrative summary
- structured signal
- listening hook

The system should never collapse these into one vague output.

## Design principles

### Listen first

The product should lead with hearing before reading.

### Quote with integrity

Displayed quotes must remain verbatim.

### Summaries are not transcripts

Narrative summaries must synthesize meaning, not echo raw text.

### Cluster before clutter

Release intelligence should group repeated patterns rather than list redundant fragments.

### One surface, one job

Each UI layer should have a clear role:

- player for momentum
- deck for interpretation
- decision board for synthesis

### Share only what holds up

Public artifacts should come from trustworthy signal, not AI embellishment disguised as spoken truth.

## Current implementation status

Implemented:

- response-level insight expansion
- release-level insight storage
- release-level aggregation pipeline
- creator listening surfaces wired to richer insight artifacts
- share surfaces reading release-level signal and quotes

Still operationally important:

- database migration must be applied in production
- worker must be running for new transcript/insight flow
- historical backfill should be run so older takes match the new frontend

## Operational notes

To keep backend and frontend aligned:

- apply the latest database migration
- run the queue worker
- run insight backfill after upgrading extractor/storage shape

Relevant files:

- [schema-production.sql](../../database/schema-production.sql)
- [2026-04-05_insight_engine_v3.sql](../../database/migrations/2026-04-05_insight_engine_v3.sql)
- [insight-extractor.ts](../../lib/server/insight-extractor.ts)
- [release-insight-engine.ts](../../lib/server/release-insight-engine.ts)
- [backfill-insight-engine.mjs](../../scripts/backfill-insight-engine.mjs)
