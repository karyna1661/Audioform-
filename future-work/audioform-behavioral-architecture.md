# Audioform Behavioral Architecture

## Product Definition
Audioform is a **structured emotional signal extractor** for creators making uncertain product decisions.

The product is not a survey builder. It is a **decision-clarification engine**.

Transformation statement for v1 beta:
- **"Audioform turns buried insights into audible clarity."**

## Core Value Moment (North Star)
The creator should feel:
- "I heard something I would not have gotten in text."
- "Someone articulated something powerful."
- "This changed how I see my product."

All product behavior should reduce time from "I am uncertain" to this moment.

## JTBD (Job To Be Done)
When I am uncertain about a product decision, I want to collect authentic voice feedback quickly and surface high-signal responses, so I can decide with confidence.

## Four-Layer Behavioral Architecture

### 1. Trigger (why a creator starts)
Design principle:
- Start from decision uncertainty, not form creation.

Behavioral prompts:
- "What decision are you trying to make?"
- "What are you unsure about?"
- "What signal would change your mind?"

Required product behaviors:
- Onboarding starts with decision framing.
- Survey setup asks for decision context before questions.
- Creator selects a feedback intent mode:
  - Validation
  - Critique
  - Confusion discovery
  - Emotional reaction
- Optional urgency framing:
  - "Feedback closes in 24 hours - hear raw insight fast."

### 2. Action (how responders contribute)
Design principle:
- Increase response depth by increasing perceived importance.

Required respondent behaviors:
- Prompt-level guidance: "Speak as if the creator will hear this personally."
- Suggested duration per answer: 20-45 seconds.
- Clear progress feedback without pressure.
- One-action retry/re-record before submit.
- One-click recording with immediate waveform feedback.
- Optional playback before submit for confidence and quality uplift.
- Explicit stored confirmation cue after submit.

Depth guardrails:
- Warn when response is too short (< 10 seconds).
- Encourage expansion: "Can you add one concrete example?"

### 3. Reward (how creator gets payoff fast)
Design principle:
- Immediate value extraction after first responses.

Required creator feedback surfaces (v1):
- First response highlighted as an event.
- Most replayed response.
- Average response length.
- "Response quality distribution" (short / medium / deep).
- Quick "mark valuable clip" action.
- Early anti-empty-room strategy (seed first 3-5 responses in beta where needed).

Required creator feedback surfaces (v2):
- Key themes (auto-clustered).
- "Most emotionally intense" moments.
- "Most decision-relevant" clips.

Critical latency target:
- TTFR (time to first response) must be minimized.

### 4. Reinforcement (why they return)
Design principle:
- Make value accumulation visible and repeatable.

Required loops:
- New response notifications (in-app + email).
- Session growth indicators over time.
- Bookmark high-signal responses.
- Return prompts: "3 new responses worth listening to."
- Lightweight follow-up recommendation:
  - "Create another form to clarify X."

Future loop extensions:
- Share/export strong clips to team channels.
- Weekly "decision signal digest".

## Behavioral Metrics (Primary)
1. TTFR (Time to First Response)
2. % responses > 20 seconds
3. % creators who revisit responses at least twice

Secondary:
1. Median response duration by prompt template
2. Replay rate per response
3. Bookmark rate per response
4. Creator week-2 return rate
5. Response submission rate
6. Forms created per creator

## Event Instrumentation Schema
Creator events:
- `creator_onboarding_started`
- `decision_intent_selected`
- `survey_published`
- `response_inbox_opened`
- `response_replayed`
- `response_bookmarked`
- `creator_returned_within_7d`

Responder events:
- `respondent_started`
- `response_recording_started`
- `response_recording_submitted`
- `response_duration_bucketed` (short/medium/deep)
- `respondent_completed`

System events:
- `first_response_received`
- `ttfr_computed`
- `notification_sent`
- `notification_opened`

## Prompt Template System (High-Leverage Layer)
If prompts are weak, responses are weak, retention fails.

Required starter packs:
- Confusion discovery:
  - "What part of this is confusing?"
  - "Where did you hesitate and why?"
- Risk discovery:
  - "What feels risky about this idea?"
  - "What would stop you from using this?"
- Value clarity:
  - "What felt unexpectedly useful?"
  - "What would you miss if this disappeared?"
- Direct critique:
  - "If you were me, what would you fix first?"
  - "Say what you really think in 20-45 seconds."

Template quality scoring:
- Average response length
- Replay rate
- Bookmark rate
- Creator-rated usefulness

## Rollout Phases

### Phase 1 (Now): Momentum Loop
- Decision-framed onboarding copy.
- Prompt templates integrated into creator flow.
- Respondent guidance + duration expectations.
- First-response event card in dashboard.
- TTFR tracking and dashboard display.
- First-response highlight + "valuable clip" mark action.

Exit criteria:
- TTFR median reduced by 30% from baseline.
- >= 50% responses exceed 20 seconds.
- Response submission rate improves from current baseline.

### Phase 2: Signal Extraction
- Most replayed + quality distribution + bookmarks.
- Notification tuning for creator revisit.
- Revisit rate optimization.

Exit criteria:
- >= 35% creators revisit responses twice.
- Bookmark rate reaches stable baseline.

### Phase 3: Insight Layer
- Theme clustering.
- Decision-relevance ranking.
- Weekly decision digest.

## Immediate Product Decisions
1. Keep survey creation focused on decision intent first.
2. Keep respondent flow focused on depth cues and low-friction recording.
3. Keep dashboard focused on immediate reward visibility.
4. Prioritize TTFR improvements over additional UI breadth.

## Tactical UX Blueprint (v1 Beta)

### Trigger
Goal:
- Spark creator intent around uncertainty and hidden insight.

Tactics:
- Contextual onboarding questions:
  - "What's the one thing you don't see clearly about your product?"
  - "Collect feedback you'd never get in writing."
- Prompt templates that prime depth.
- Optional 24h urgency mode.

### Action
Goal:
- Reduce friction and increase response depth.

Tactics:
- One-click recording.
- Waveform feedback during recording.
- Suggested response duration: 20-45 seconds.
- Playback before submit.
- Clear saved confirmation.

### Reward
Goal:
- Make first insights audible and meaningful immediately.

Tactics:
- Highlight first 1-2 responses.
- Show duration/effort indicators.
- Surface most replayed response.
- Allow creator to mark valuable clips.

### Reinforcement
Goal:
- Convert one strong insight session into repeat behavior.

Tactics:
- "X new responses" notifications.
- Depth metrics and trend visibility.
- Quick follow-up prompt creation.
- Share/export clips in later phase.

## Developer-Ready Behavioral Flow

```text
[Landing / Onboarding]
  -> Trigger copy focused on uncertainty
  -> Decision intent capture
  -> Prompt template selection

[Create Form]
  -> Context-rich title + goal
  -> Auto-generated share link
  -> "Get first 5 responses quickly" guidance

[Responder Entry]
  -> "Speak your insight (20-45 seconds)"
  -> One-click record + waveform + playback
  -> Submission confirmation cue

[Response Arrival]
  -> Creator gets immediate notification
  -> Dashboard highlights first response as event

[Creator Reward Surface]
  -> Most replayed response
  -> Avg response length
  -> Valuable clip flagging

[Reinforcement]
  -> New response nudges
  -> Return prompts
  -> Repeat form creation loop
```

## Screen-Level Behavioral Microcopy (v1)

Creator onboarding:
- "What decision are you trying to make right now?"
- "What feedback would change your mind?"

Responder recording:
- "Speak as if the creator will hear this personally."
- "20-45 seconds is perfect."

Creator dashboard:
- "Your first response just came in."
- "3 new responses worth hearing now."

## Workflow Orchestration Execution Protocol

Execution order:
1. Behavioral definition (this document).
2. Route-level implementation mapped to Trigger/Action/Reward/Reinforcement.
3. Baseline UI and accessibility hardening.
4. Instrumentation + metric verification.
5. Weekly learning loop with lessons capture.

Skill coordination model:
- `interface-design`: information architecture and task flow fidelity.
- `frontend-design`: concrete route implementation and experience quality.
- `baseline-ui`: consistency, typography, interaction constraints.
- `fixing-accessibility`: keyboard/focus/labels/errors semantics.

Done criteria for any feature:
- Behavior target declared.
- Event instrumentation added.
- Metric impact hypothesis defined.
- Verified route behavior and no regression on core flows.

## Regen / Voxera Positioning
Regen is internal leverage if it reduces iteration time and improves diagnostic clarity.
Primary rule:
- Use Regen to accelerate feedback-loop quality and product learning velocity.

## Team Operating Rules
1. Never ship a feature without an explicit behavior it is intended to move.
2. Every new surface must map to Trigger, Action, Reward, or Reinforcement.
3. Every sprint must include one TTFR or depth-improving change.
4. Do not add complexity that does not shorten time to Core Value Moment.
