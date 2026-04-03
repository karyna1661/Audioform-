# Audioform User Flow Walkthrough

## Purpose

This document maps the current Audioform journey from first visit through release listening and response review.

It is intentionally content-light. Product owns the flow, states, and interaction model. Marketing can supply the live messaging, headlines, CTA copy, examples, and campaign framing without changing the underlying journey.

---

## Content Ownership

Use this split when deciding what belongs in product specs versus launch copy:

| Area | Product owns | Marketing owns |
| --- | --- | --- |
| Homepage | Structure, sections, CTA placement, navigation targets | Hero headline, subhead, proof copy, CTA text |
| Auth entry | Sign-in options, redirect behavior, trust states | Supporting reassurance copy |
| Listen home | Release ranking, player layout, quick-entry listening actions | Empty-state text, framing copy, CTA wording |
| Studio | Form fields, template system, quality coach, publish flow | Naming guidance, example survey titles, explainer copy |
| Respondent flow | Recording UX, progress, submission behavior | Prompt framing, helper hints, thank-you copy |
| Notifications | Trigger logic, payload shape, destination links | Subject lines, preview text, email body copy |

If we need examples before final copy exists, use bracketed placeholders such as `[Hero headline]` or `[Thank-you message]`.

---

## Journey Overview

1. Builder discovers Audioform and lands on the homepage.
2. Builder signs in and reaches Listen.
3. Builder moves into Studio to create and publish a release.
4. Respondent opens the survey and records a voice response.
5. Audioform stores and transcribes the response.
6. Builder listens through ranked takes and extracts signal for a decision.

---

## 1. Discovery And First Visit

### Entry Point

**URL:** `/`

**User:** prospective builder

**What the product must do:**
- Present the product value clearly above the fold.
- Show proof that voice feedback is the core interaction.
- Provide a primary CTA that leads to authentication.

**Marketing content slots:**
- `[Hero headline]`
- `[Hero subhead]`
- `[Primary CTA label]`
- `[Proof module copy]`

**Primary action:** user selects the main CTA and is routed to `/login`.

---

## 2. Authentication

### Sign-In Flow

**URL:** `/login`

**User:** new or returning builder

**Product flow:**
1. User selects Google sign-in.
2. OAuth consent completes.
3. Server creates a session.
4. User is redirected to `/admin/dashboard/v4`.

**Product requirements:**
- Auth should feel fast and low-friction.
- Redirect target should be deterministic.
- Session handling should be secure and durable.

**Marketing content slots:**
- `[Login reassurance copy]`
- `[Trust/privacy note]`

---

## 3. Listen Home

### First Creator Touchpoint

**URL:** `/admin/dashboard/v4`

**User:** authenticated creator

**What the product must show:**
- Ranked releases
- Starter listening surfaces
- Quick actions into Studio
- Release-first listening context

**Core product goal:**
Move the creator into the strongest takes quickly, then into Studio when a release needs refinement.

**Marketing content slots:**
- `[Listen empty-state headline]`
- `[Listen empty-state body copy]`
- `[Open Studio CTA label]`

**Primary action:** user opens a release or moves into Studio.

---

## 4. Studio Creation Flow

### Builder Interface

**URL:** `/admin/questionnaires/v1`

**User:** creator shaping a release

### Phase A: Define Context

**Product inputs:**
- Survey title
- Decision context
- Any supporting metadata already supported by the builder

**Marketing content slots:**
- `[Example title]`
- `[Helper copy for survey naming]`

### Phase B: Build Question Flow

**Product capabilities:**
- Pre-built templates
- Category-based question browsing
- Quality coach feedback
- Suggested rewrites or improvements

**Product rules:**
- Voice surveys should bias toward 1-3 strong questions.
- Questions should encourage stories, specifics, and concrete moments.
- Quality scoring should prevent weak survey setup from feeling like success.

**Marketing content slots:**
- `[Template descriptions]`
- `[Question-writing helper copy]`
- `[Quality coach instructional text]`

### Phase C: Preview And Publish

**Product capabilities:**
- Preview the respondent-facing experience
- Save draft
- Publish survey
- Generate shareable link

**Definition of done:**
- Release status changes to `published` or `live`
- Shareable respondent URL is available
- Public listening state is explicit
- Publish event is tracked

**Marketing content slots:**
- `[Publish confirmation copy]`
- `[Link share helper copy]`

---

## 5. Respondent Flow

### Open Survey

**URL:** `/questionnaire/v1?surveyId={id}`

**User:** respondent, no login required

**What the product must show:**
- Survey title
- Current question
- Progress indicator
- Recording control

**Marketing content slots:**
- `[Survey intro copy]`
- `[Question helper hint]`

### Record Response

**Product flow:**
1. User grants microphone permission.
2. Recording starts.
3. User stops recording.
4. User reviews, retakes, or submits.

**Product requirements:**
- Recording controls must be obvious on desktop and mobile.
- Retake must feel safe.
- Submission should not require extra account creation.

### Submit Response

**Backend behavior:**
1. Receive audio file.
2. Store audio.
3. Transcribe audio.
4. Save metadata and transcript.
5. Return success state.

### Thank-You State

**URL:** post-submit success screen

**Product goal:**
Give the respondent a clear end state and optional next action.

**Marketing content slots:**
- `[Thank-you headline]`
- `[Thank-you body copy]`
- `[Optional share CTA]`

---

## 6. Listen And Review Flow

### Notification

**Trigger:** new response received

**Product responsibility:**
- Notify the builder with a reliable link back to review.

**Marketing content slots:**
- `[Email subject line]`
- `[Email preview text]`
- `[Notification body copy]`

### Global Listen Surface

**URL:** `/admin/responses`

**What the product must support:**
- Cross-release starter pack
- Release library
- Fast drill-down into one release

### Release Detail

**Product capabilities:**
- Release player
- Take Deck
- Transcript review
- AI summary review
- High-signal/save/flag actions
- Public-playlist moderation when enabled

**Core job to be done:**
Help builders detect repeated friction, confusion, or desire signals quickly enough to make a product decision.

---

## 7. Embed Flow

### Embedded Collection

**Product behavior:**
- Builder can copy an embed snippet.
- End users can record feedback without leaving the host site.
- Responses flow into the same dashboard and review queue.

**Marketing content slots:**
- `[Embed setup copy]`
- `[Embedded widget CTA copy]`

---

## 8. Mobile Expectations

The same journey should work on mobile with no loss of core functionality.

### Dashboard
- Single-column friendly layout
- Touch-safe controls
- Clear primary action

### Builder
- Editable question cards
- Readable quality feedback
- Publish flow that does not rely on hover states

### Respondent Flow
- Large recording target
- Minimal scrolling
- Clear permission and submission states

---

## Decision Signals We Expect Builders To Extract

The product is working if builders can move from raw responses to a usable decision such as:

- "Users cannot find the primary action."
- "The onboarding sequence is too dense."
- "The feature concept is valuable, but setup is confusing."
- "The message resonates, but the proof is weak."

Marketing does not need to define these signals. Marketing can sharpen how we describe the outcome to prospects, but product should preserve the path that generates the signal.

---

## Recommended Working Model With Marketing

When marketing is ready to push content, they should work from these slots instead of rewriting the flow doc:

1. Homepage messaging pack
2. Dashboard empty-state pack
3. Builder guidance pack
4. Respondent reassurance pack
5. Notification and thank-you pack

That keeps copy iteration separate from product behavior and reduces churn in product documentation.

---

## Open Follow-Up Doc We May Want

If helpful, the next document to create is:

`docs/product/MARKETING_CONTENT_SLOTS.md`

That file can list every user-facing string cluster by screen so marketing has a direct handoff surface without touching implementation notes.

---

**Last Updated:** March 27, 2026
**Version:** 2.0
