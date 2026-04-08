# Audioform Creator Product Loop PRD

## Document purpose

This document defines the product requirements and jobs-to-be-done framework for Audioform's creator journey.

The journey covered here begins when a creator enters the product and ends when they:

- shape a release in Studio
- publish and distribute it
- receive voice takes
- listen to ranked responses
- understand clustered intelligence
- act on signal
- optionally turn strong signal into shareable artifacts

This PRD is meant to align product, design, copy, and implementation around one coherent creator loop.

## Product vision

Audioform should help creators move from prompt design to decision-ready signal without getting buried in raw responses.

The creator loop should make it easy to:

- create better prompts
- publish a release with confidence
- distribute it through the right channels
- hear the strongest takes first
- understand what is repeating across many responses
- turn voice into product, research, and messaging decisions

Compressed into one line:

Audioform helps creators publish a voice release, hear the strongest takes first, and convert many responses into ranked playback, clustered intelligence, and shareable signal.

## Problem statement

Most survey and feedback tools break the creator journey into disconnected activities:

- one tool to make a form
- another place to collect responses
- a spreadsheet or dashboard to analyze them
- a separate workflow to share findings

That creates several problems:

- prompt quality is not treated as a first-class product decision
- the response review experience feels like inbox triage, not listening
- creators struggle to hear signal before being forced into analysis
- repeated themes stay buried inside raw responses
- insights are hard to turn into artifacts worth sharing

Audioform should solve this by making the creator experience one loop:

1. shape the release
2. distribute it
3. receive takes
4. listen first
5. understand patterns
6. act and share

## Success criteria

The creator flow succeeds when:

- creating a release feels simple but intentional
- the creator understands the path from Studio to Listen
- publishing and sharing feel like part of the same workflow
- the first useful signal can be heard quickly after responses start arriving
- the product surfaces strongest takes before full analysis
- release-level intelligence helps creators see repetition, opportunity, and divergence
- creators can move from signal to action without needing an external analysis workflow

## Users

### Primary creator

A founder, researcher, product lead, marketer, educator, or operator collecting voice responses around a release.

Traits:

- wants speed and clarity
- may not be a research specialist
- wants honest signal, not just volume
- wants insight that can turn into a decision
- is often time-constrained

### Secondary creator

A more deliberate analyst or researcher who needs:

- deeper transcript inspection
- better quote handling
- clustered reasoning
- repeatable signal interpretation

### Responder as downstream participant

The creator loop depends on responders joining and completing their own loop, but the creator is the primary operator in this PRD.

## Scope

### In scope

- creator home / Listen entry
- Studio prompt creation
- release configuration
- release publishing
- share hub
- QR/social distribution
- starter pack
- release player
- Take Deck
- release decision board
- public listening configuration
- shareable insight artifacts

### Out of scope

- billing and account management
- team collaboration permissions
- multi-creator workspace administration
- advanced analytics exports
- third-party integrations beyond current release workflow assumptions

## Core product loop

### Loop summary

The creator loop is:

1. enter the workspace
2. open Studio
3. shape a release
4. publish
5. distribute through share surfaces
6. collect voice takes
7. listen to the strongest takes first
8. inspect individual takes
9. understand clustered release intelligence
10. act on and share the signal

### Why this loop matters

The loop turns creation from:

- “I made a survey”

into:

- “I launched a release”
- “I can hear what people actually mean”
- “I know what patterns are emerging”
- “I can turn those patterns into decisions”

That is what gives Audioform its creator-side identity.

## Journey stages

## 1. Creator entry

### Goal

Help the creator understand where they are returning to and what the product is for.

### Requirements

- creator entry should lead naturally into Listen or Studio
- the product model should be legible:
  - Studio = create and shape
  - Listen = hear and review
- the landing state should reduce ambiguity about what happens next

### Desired emotion

- oriented
- capable
- ready to act

## 2. Studio: shape the release

### Goal

Help the creator create prompts that produce better voice signal.

### Requirements

- Studio must make prompt creation feel intentional, not like generic form building
- the creator must be able to:
  - title the release
  - shape the prompt sequence
  - understand how the release will feel to responders
  - set whether public listening is enabled
- the release should be easy to revise before publish

### Behavioral intent

Studio should answer:

- what am I asking?
- how will responders experience this?
- what kind of takes am I likely to get?

### UX principles

- prompt quality is the first insight lever
- avoid builder jargon
- emphasize release shaping, not survey administration

## 3. Publish

### Goal

Turn a shaped draft into a live release with confidence.

### Requirements

- publishing should feel like moving from preparation to live listening
- public/private listening configuration must be clear
- the system should make the creator understand:
  - what is live
  - what link/QR assets they can now use
  - where responses will appear

## 4. Share and distribute

### Goal

Help the creator get the release into the right context without leaving the product.

### Requirements

- share hub should support:
  - social preview link
  - QR/live survey link
  - OG preview image
  - first-question framing
- QR and social distribution should be distinct
- the share hub should clarify:
  - QR = in-person handoff
  - social = conversation invite

### Creator questions this stage must answer

- how do I get this in front of people?
- what will they see first?
- how do I know whether they are entering from QR or social?

## 5. Collect responses

### Goal

Help the creator feel momentum as takes begin to land.

### Requirements

- incoming takes should feel like a release filling with voices, not a static list
- the creator should be able to trust that responses are recorded and processed
- when enrichment is pending, the system should still preserve listening continuity

### Desired emotion

- momentum
- curiosity
- anticipation

## 6. Listen first

### Goal

Get the creator into the strongest signal as quickly as possible.

### Core surfaces

- cross-release starter pack
- release starter pack
- release player
- persistent player

### Requirements

- strongest takes surface first
- preview mode should reduce decision cost
- full-take mode should remain available
- persistent playback should survive navigation
- the creator should be able to move between release-level and take-level review without losing context

### Behavioral intent

The listening layer should answer:

- what should I hear first?
- what release deserves my attention right now?
- where is the strongest signal?

## 7. Inspect individual takes

### Goal

Help the creator move from momentum to interpretation.

### Core surface

- Take Deck

### Requirements

- each take should unify:
  - audio
  - power quote
  - narrative summary
  - transcript
  - signal fields
  - creator actions
- transcript should not dominate the header layer
- quote, summary, and signal should remain semantically distinct
- creator actions should be available without leaving the take context

### Behavioral intent

The Take Deck should answer:

- what did this person actually mean?
- what is the best verbatim line from this take?
- is this high signal, worth saving, or worth flagging?

## 8. Understand the release as a whole

### Goal

Help the creator understand what is repeating across the release without reading every take manually.

### Core surface

- release decision board / signal summary

### Requirements

- release-level intelligence must include:
  - narrative summary
  - top complaints
  - top opportunities
  - emerging signals
  - contrarian insights
  - clusters
  - representative takes
  - share artifacts
- clusters should feel like grouped signal, not raw lists
- the creator should be able to jump from a cluster directly into a representative take

### Behavioral intent

This surface should answer:

- what is repeating?
- what opportunity is implied?
- what viewpoint goes against the majority?
- what take best represents each cluster?

## 9. Act on signal

### Goal

Help the creator turn voice signal into concrete product or messaging decisions.

### Requirements

- the product should make decisions feel easier, not just expose more data
- take-level and release-level surfaces should work together
- the creator should be able to:
  - mark high signal
  - save important takes
  - flag problematic takes
  - identify quotes worth carrying

### Examples of downstream actions

- refine onboarding copy
- revise product workflow
- sharpen positioning language
- identify a new opportunity area
- share internal evidence with the team

## 10. Share signal artifacts

### Goal

Help the creator move from raw input to artifacts that are easy to circulate.

### Requirements

- share artifacts must come from trustworthy signal
- verbatim quotes must remain verbatim
- release summaries must represent grouped intelligence, not loose transcript fragments
- share surfaces should allow creators to carry:
  - top quote
  - best cluster
  - release narrative

## Jobs to be done

## Functional jobs

### Job 1: Shape better prompts

When I am preparing a release,
I want to structure prompts intentionally,
so I get stronger voice signal later.

### Job 2: Launch confidently

When my release is ready,
I want to publish and distribute it from one coherent workflow,
so I can start collecting responses immediately.

### Job 3: Hear strongest takes first

When responses begin arriving,
I want the product to surface the most important takes first,
so I do not waste time listening blindly.

### Job 4: Understand one take deeply

When I hear a take that matters,
I want transcript, quote, summary, and signal in one place,
so I can understand it and act on it quickly.

### Job 5: Understand the whole release

When many people have responded,
I want grouped release intelligence,
so I can see repetition, opportunity, and divergence without manually synthesizing everything.

### Job 6: Carry the signal forward

When I find strong evidence,
I want to turn it into quotes, clusters, and summaries worth sharing,
so the release produces usable artifacts beyond the listening session.

## Emotional jobs

### Emotional job 1: Feel in control

The creator should feel they are shaping the release, not wrestling a form builder.

### Emotional job 2: Feel momentum

The response review experience should feel alive and playable, not static and administrative.

### Emotional job 3: Feel clarity

The creator should feel the product helps them see what matters, not just show more information.

### Emotional job 4: Feel confidence

Insights should feel trustworthy enough to act on and share.

## Social jobs

### Social job 1: Start a conversation

The creator should feel they are launching a release into a room, not posting a dead survey link.

### Social job 2: Carry evidence credibly

The creator should be able to circulate a quote or clustered insight without worrying that it is synthetic or misleading.

## UX requirements by surface

## Studio

Must do:

- frame creation as shaping a release
- make prompt quality feel central
- keep public listening configuration understandable
- connect publishing directly to distribution

Must not do:

- feel like a generic form builder
- overload with admin complexity

## Share hub

Must do:

- distinguish QR and social distribution
- preview what responders will see
- make first-question framing strong
- support real distribution actions cleanly

Must not do:

- flatten QR and social into the same experience
- behave like a copy-link utility only

## Starter pack and release player

Must do:

- prioritize strongest takes
- keep listening friction low
- let the creator stay in flow

Must not do:

- force transcript-first review
- make playback feel like utility audio controls

## Take Deck

Must do:

- preserve the distinction between quote, narrative summary, signal, and transcript
- make creator actions accessible without fragmentation
- support audio-first interpretation

Must not do:

- repeat transcript text unnecessarily
- collapse quote and summary into the same output

## Release decision board

Must do:

- summarize patterns across many takes
- surface grouped complaints and opportunities
- highlight representative takes and quotes
- support fast movement between synthesis and evidence

Must not do:

- feel like raw JSON in UI form
- list duplicate complaints without grouping

## Product principles

### 1. Prompt quality shapes signal quality

Studio is not upstream decoration; it determines what kinds of takes the creator will later hear.

### 2. Listen before analyzing

Playback should come before heavy interpretation.

### 3. One take, many layers

A single take can support:

- listening
- quote extraction
- summary
- transcript
- structured signal

These layers must remain distinct.

### 4. Release intelligence is a separate layer

Release-level synthesis should not be confused with a collection of individual summaries.

### 5. Trust is a product feature

Quotes must remain verbatim and shared artifacts must remain grounded in evidence.

## Metrics and evaluation

### Primary metrics

- draft-to-publish rate
- publish-to-first-response time
- share hub usage rate
- first-listen time after responses arrive
- percentage of creators who play at least one take after responses start
- percentage of creators who open release-level signal summary

### Secondary metrics

- average number of takes played per release
- save / high-signal / flag action rates
- refresh rate for release insight
- use of representative take entry from clusters
- share artifact usage rate

### Qualitative signals

- do creators understand the Studio vs Listen split?
- do they feel the release player helps them start faster?
- do they trust the distinction between quote, summary, and signal?
- do release-level insights feel decision-ready?

## Risks

### Risk 1: Studio and Listen feel disconnected

If creation and review do not feel like one loop, the product feels fragmented.

### Risk 2: Listening gets buried by analysis

If transcript and summary dominate too early, Audioform loses its listening-native identity.

### Risk 3: Release intelligence feels shallow

If clustering and opportunity surfaces are weak, the product feels like a nicer transcript browser instead of a decision tool.

### Risk 4: Shared artifacts lose trust

If quotes or summaries feel synthetic or duplicated, creators will stop relying on them.

## Implementation implications

The creator loop depends on:

- Studio authoring and release configuration
- release publishing state
- share hub and source-aware link generation
- response ingestion and transcript generation
- response-level insight extraction
- release-level aggregation
- listening player and Take Deck surfaces
- clustered release insight surfaces

Relevant architecture and related docs:

- [INSIGHT_ENGINE_PRODUCT_ARCHITECTURE.md](./INSIGHT_ENGINE_PRODUCT_ARCHITECTURE.md)
- [RESPONDER_PRODUCT_LOOP_PRD.md](./RESPONDER_PRODUCT_LOOP_PRD.md)
- [STUDIO_LISTEN_ARCHITECTURE.md](./STUDIO_LISTEN_ARCHITECTURE.md)
- [USER_FLOW_WALKTHROUGH.md](./USER_FLOW_WALKTHROUGH.md)

## Product summary

Audioform's complete creator loop should make one thing feel obvious:

I didn’t just make a survey. I launched a release, heard the strongest voices first, understood what was emerging, and turned those voices into decisions and signal I could carry forward.
