# Audioform Responder Product Loop PRD

## Document purpose

This document defines the product requirements and jobs-to-be-done framework for Audioform's responder journey.

The journey covered here begins when a person receives or scans a release link and ends when they:

- understand the prompt context
- submit a voice response
- optionally unlock listening to other responses when the release is public
- complete the creator-responder-listening loop

This PRD is meant to align product, design, copy, and implementation around one coherent responder flow.

## Product vision

Audioform should feel less like filling out a survey and more like entering a live voice conversation.

The responder loop should make it easy to:

- understand why this release exists
- contribute one honest voice take quickly
- trust what happens after submission
- unlock player mode when public listening is enabled
- hear how other people responded to the same release

Compressed into one line:

Audioform turns survey participation into a voice-native conversation loop: enter, speak, and, when allowed, listen back into the collective signal.

## Problem statement

Traditional survey flows flatten participation into a form-completion event.

That creates several problems:

- responders do not understand the context or social shape of the conversation
- contributing feels like administrative work
- completion has no meaningful payoff
- voice responses risk feeling isolated instead of connected
- public listening, when available, can feel bolted on rather than earned

Audioform should solve this by making the responder experience a clear loop:

1. arrive with context
2. respond with voice
3. understand what happened
4. listen to the room if the release is public

## Success criteria

The responder flow succeeds when:

- the first screen makes the release legible within seconds
- the responder knows what they are about to do and why it matters
- recording and submission feel low-friction
- the thank-you state feels true to the release state
- public listening unlock feels like a reward, not an unrelated extra
- private releases still feel complete and honest
- QR and social link entry feel intentionally different

## Users

### Primary responder

A person who receives a link or scans a QR code and contributes one voice take.

Traits:

- low context at entry
- low patience for setup friction
- wants clarity quickly
- may not know the creator personally
- may or may not be willing to make their response public

### Creator as downstream beneficiary

The creator is not the actor in this flow, but the experience must still support the creator's goal:

- receive honest voice input
- get public listening only when intentionally enabled
- maintain trust between prompt, response, and listening

## Scope

### In scope

- QR-entry release landing
- social-link release landing
- direct-link fallback behavior
- respondent recording flow
- response submission
- private thank-you state
- public thank-you state
- public-but-empty thank-you state
- responder player unlock when public listening is enabled
- source-aware copy and UI distinctions

### Out of scope

- creator-side Studio authoring
- creator-side Take Deck moderation workflows
- admin analytics dashboards
- recommendation systems for “what to answer next”
- multi-release responder identity systems
- long-term responder profiles

## Core product loop

### Loop summary

The product loop is:

1. receive a release
2. understand the invitation
3. speak one take
4. submit
5. get a truthful completion state
6. if public listening is enabled, enter player mode
7. hear the shape of other responses

### Why this loop matters

The loop turns participation from “I completed a survey” into:

- “I joined a conversation”
- “my take now sits in a release”
- “I can hear how others answered too”

That is what gives the product its listening-native identity.

## Entry states

The responder journey begins in one of three source states.

### QR entry

Source marker:

- `src=qr`

Core framing:

- `Scan. Speak. Listen.`

Intended context:

- in-person
- event
- classroom
- workshop
- live session
- poster / handoff moment

Desired emotion:

- immediate
- spatial
- lightweight
- conversational

The QR path should feel like entering a room.

### Social link entry

Source marker:

- `src=social`

Core framing:

- `Hear. Speak. Join.`

Intended context:

- WhatsApp share
- X share
- Telegram share
- copied link from a creator

Desired emotion:

- invited
- curious
- socially contextualized

The social path should feel like joining a conversation already in motion.

### Direct entry fallback

Source marker:

- `src=direct`
  or absent source

Core framing:

- neutral non-scan wording

Desired behavior:

- do not force QR language
- do not overclaim social context
- keep the release legible and easy to enter

## Journey stages

## 1. Release landing

### Goal

Help the responder understand:

- what this release is
- what the first prompt is
- how participation works
- what happens after they respond

### Requirements

- show release title clearly
- show first prompt clearly
- explain voice-first participation
- explain the 3-step loop in source-aware language
- indicate whether public listening exists without promising it when unavailable
- give one clear CTA into the response flow

### Source-specific copy requirements

QR entry:

- use `Scan. Speak. Listen.`
- emphasize immediacy and room-entry feeling

Social entry:

- use `Hear. Speak. Join.`
- emphasize shared conversation and context

Direct entry:

- use neutral release-entry framing

### Public listening requirements

If public listening is enabled:

- say that listening unlock happens after submission
- do not imply immediate listening before contribution

If public listening is disabled:

- clearly say the creator can still review the take privately
- do not present player unlock as available

## 2. Recording flow

### Goal

Make answering feel fast, focused, and low-friction.

### Requirements

- clear question text
- easy record/stop/retry controls
- low cognitive load
- source-aware top framing
- clear expectation for what happens on submit
- public listening opt-in shown only if public listening is enabled

### Public listening opt-in rules

If the release is private:

- do not ask the responder to opt into public listening
- default experience is private creator review

If the release is public:

- ask whether the responder wants their take to be eligible for public listening
- explain this in plain language
- make the choice explicit, not hidden

### Recording UX principles

- speaking should feel easier than typing
- the flow should avoid survey-like overload
- a single answer should feel meaningful on its own

## 3. Submission moment

### Goal

Create a reliable handoff from participation to completion.

### Requirements

- clear submission confirmation
- no ambiguity about whether the take was received
- fast transition to thank-you state
- preserve source context into thank-you
- preserve public/private state into thank-you

## 4. Thank-you state

The thank-you page must branch into true states rather than copy variations on one generic confirmation page.

### State A: Private release

When public listening is unavailable or not unlocked, the page must center on:

- contribution confirmed
- creator review reassurance
- a sense that the take matters even without public playback

Requirements:

- no false unlock language
- no player-led hero state
- no fake recommendation CTA

Desired emotional outcome:

- calm
- complete
- trustworthy

### State B: Public release with playable tracks

When public listening is enabled and the responder can actually listen, the page must center on:

- contribution confirmed
- player unlock
- the shift from answering to listening

Requirements:

- player becomes a major element of the page
- copy frames this as entering the listening room
- other responders are presented as part of the same release context

Desired emotional outcome:

- rewarded
- curious
- invited to continue

### State C: Public release but room still filling

When public listening is enabled but there are not yet playable tracks:

- acknowledge contribution
- confirm that the listening room exists
- explain that it is still filling
- do not overpromise immediate playback

Desired emotional outcome:

- anticipatory
- honest

## 5. Responder player mode

### Goal

Let responders hear other voices in a way that feels like a continuation of the same release, not a separate feature.

### Requirements

- only unlocked after contribution when public listening is enabled
- strongest takes should surface first
- playback should feel like a real player, not a list of files
- mode should feel consistent with the creator-side preview-first listening model

### Behavioral intent

The responder player should answer:

- what did other people say about this same prompt?
- how varied is opinion here?
- what is the emotional shape of this conversation?

### Constraints

- do not expose private takes
- do not pretend a response is public if the responder did not opt in
- do not confuse creator listening with responder listening

## Jobs to be done

## Functional jobs

### Job 1: Understand the invitation

When I open a release link,
I want to understand what I’m being asked and why it matters,
so I can decide quickly whether to respond.

### Job 2: Contribute quickly

When I’m ready to answer,
I want to record my take with minimal friction,
so I can contribute honestly without feeling like I’m filling out a form.

### Job 3: Know what happened

When I submit my take,
I want immediate confirmation and a truthful explanation of what happens next,
so I trust that my response was received and used appropriately.

### Job 4: Join the listening room

When a release is public,
I want to hear other responses after I contribute,
so I can understand the broader conversation I just joined.

### Job 5: Protect my intent

When public listening is optional,
I want control over whether my take is public,
so I can participate without losing confidence in how my voice will be used.

## Emotional jobs

### Emotional job 1: Feel invited, not processed

The flow should feel like joining a conversation, not completing a task queue.

### Emotional job 2: Feel safe

The responder should know what is public, what is private, and what the creator can see.

### Emotional job 3: Feel heard

The thank-you state should make the responder feel that their take now has a place in something real.

### Emotional job 4: Feel connected

When public listening is enabled, the responder should feel connected to a chorus, not dropped into an unrelated player.

## Social jobs

### Social job 1: Join the room

For QR and social entry alike, the responder should feel there are other people here, not just a single isolated submission event.

### Social job 2: Trust the conversation boundary

The responder should trust that public listening only happens when the release is truly public and when their participation rules allow it.

## UX requirements by surface

## Public share / release page

Must do:

- distinguish QR vs social entry
- show release title and first prompt prominently
- explain what happens after responding
- preserve credibility around public/private behavior
- give one clear CTA

Must not do:

- feel like a generic survey landing page
- over-explain before showing the prompt
- use QR language on social entry

## Respondent recording page

Must do:

- maintain source-aware framing
- keep controls obvious and low-friction
- explain public opt-in only when relevant
- preserve momentum from landing page to recording

Must not do:

- overload with survey mechanics
- show public opt-in on private releases

## Thank-you page

Must do:

- split into true states
- reward contribution honestly
- elevate player mode when unlocked
- keep private mode complete without faking unlock

Must not do:

- show generic thank-you language for every state
- imply a recommendation engine that does not exist
- overpromise listening when no tracks are ready

## Responder player

Must do:

- feel like a continuation of the same release
- lead with strongest takes
- preserve player coherence with the rest of the product

Must not do:

- feel like a file browser
- expose raw moderation or creator workflows

## Source-aware design framework

### QR path

Message:

- `Scan. Speak. Listen.`

Mental model:

- step into a room

Interaction priority:

- speed
- clarity
- immediacy

### Social path

Message:

- `Hear. Speak. Join.`

Mental model:

- join a conversation invite

Interaction priority:

- context
- social continuity
- reward through listening

### Direct path

Message:

- neutral release framing

Mental model:

- respond to a prompt with clear context

Interaction priority:

- legibility
- trust

## Product principles

### 1. Conversation over collection

The flow should feel like joining and extending a conversation, not submitting data.

### 2. Voice first, text second

The interaction should prioritize speaking and listening over form behavior.

### 3. Honest branching

Private, public, and public-but-empty states must feel intentionally different.

### 4. Unlock should feel earned

Listening to others should feel like the meaningful continuation of contribution.

### 5. Public means explicitly public

Never blur the line between private creator review and public listening.

## Metrics and evaluation

### Primary metrics

- release landing to recording-start rate
- recording-start to submission rate
- public opt-in rate on public releases
- thank-you to player-start rate on public releases
- responder player completion rate

### Secondary metrics

- average time to first recording
- average recording duration
- share-source conversion split:
  - QR
  - social
  - direct
- percent of responders who replay at least one other take

### Qualitative signals

- do responders understand whether the release is public or private?
- do they understand what happens after submission?
- do they describe the experience as a conversation rather than a survey?

## Risks

### Risk 1: Public listening feels bolted on

If the thank-you state and player mode are weakly connected, the loop breaks.

### Risk 2: Private state feels empty

If the private thank-you state lacks emotional closure, participation feels dead-ended.

### Risk 3: Source mismatch

If QR and social entry use the same language, the flow loses situational intelligence.

### Risk 4: Public trust erosion

If responders do not understand public eligibility or opt-in rules, trust collapses.

## Implementation implications

The product loop depends on:

- source-aware links and query-state handling
- release landing surfaces
- respondent recording flow
- thank-you branching
- public playlist / responder player logic
- creator-side release and listening architecture

Relevant architecture and related docs:

- [INSIGHT_ENGINE_PRODUCT_ARCHITECTURE.md](./INSIGHT_ENGINE_PRODUCT_ARCHITECTURE.md)
- [STUDIO_LISTEN_ARCHITECTURE.md](./STUDIO_LISTEN_ARCHITECTURE.md)
- [USER_FLOW_WALKTHROUGH.md](./USER_FLOW_WALKTHROUGH.md)

## Product summary

Audioform's complete responder loop should make one thing feel obvious:

I didn’t just answer a survey. I entered a release, added my voice, and, when allowed, heard the wider conversation I just joined.
