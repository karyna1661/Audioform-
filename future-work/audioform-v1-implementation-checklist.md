# Audioform v1 Implementation Checklist

This is the execution plan for implementing the behavioral architecture in production-ready increments.

Related: see `future-work/audioform-beta-readiness-checklist.md` for prioritized `P0/P1` release gating and verification criteria.

## Status Audit (2026-03-21)

### Done
- Trigger: home decision framing is live on `app/page.tsx`.
- Action: respondent flow includes record, playback, elapsed/total playback timing, depth guidance, and a lightweight short-response nudge in `app/questionnaire/v1/questionnaire-client.tsx` and `components/audio-recorder.tsx`.
- Reward: dashboard shows first-response visibility / TTFR and response quality buckets are derived from persisted metadata.
- Reinforcement: notification settings persist, creator notifications auto-send on new responses, the thank-you page includes a creator CTA with analytics tracking, and creator revisit instrumentation is now wired.

### Partial
- Trigger: survey persistence supports `intent` and `templatePack`, but the current builder does not fully save/use explicit intent-mode selection and mapping.
- Reward: valuable-clip and moderation actions persist, but the dashboard does not yet surface a real most-replayed response or average response length across surveys.

### Not Done Yet
- Explicit intent-mode to prompt-pack mapping and explanation flow.
- Most-replayed response and average response length dashboard surfaces.

## Sprint Goal
Reduce uncertainty-to-insight latency by optimizing:
1. Time to first response (TTFR)
2. Response depth (% > 20 seconds)
3. Creator revisit behavior

## Scope Map (Routes and Files)

### Trigger Layer
1. Home onboarding framing:
- Route: `/`
- File: `app/page.tsx`
- Add/confirm decision-first copy:
  - "What decision are you trying to make?"
  - "Collect feedback you'd never get in writing."

2. Survey creation intent framing:
- Route: `/admin/questionnaires`
- Files:
  - `app/admin/questionnaires/page.tsx`
  - `app/admin/questionnaires/v1/page.tsx`
- Add "decision intent" selection input.
- Store intent as metadata on draft/publish.

### Action Layer
3. Respondent depth cues and low-friction flow:
- Route: `/questionnaire`
- Files:
  - `app/questionnaire/page.tsx`
  - `app/questionnaire/v1/page.tsx`
  - `components/audio-recorder.tsx`
- Ensure:
  - one-click record
  - waveform feedback
  - "20-45 seconds is perfect" guidance
  - playback before submit
  - short-response nudge when <10s

### Reward Layer
4. Creator reward acceleration in dashboard:
- Route: `/admin/dashboard`
- Files:
  - `app/admin/dashboard/page.tsx`
  - `app/admin/dashboard/v4/page.tsx`
- Add/confirm:
  - first-response event card
  - most replayed response
  - average response length
  - response quality buckets (short/medium/deep)
  - mark valuable clip action

### Reinforcement Layer
5. Notification loops:
- Route: `/admin/notifications`
- Files:
  - `app/admin/notifications/page.tsx`
  - `app/api/email/route.ts`
- Add/confirm:
  - response notifications
  - digest options
  - "X new responses worth hearing" message templates

6. Completion momentum:
- Route: `/questionnaire/thank-you`
- File: `app/questionnaire/thank-you/page.tsx`
- Add/confirm:
  - clear next action ("answer another" / "return home")
  - reinforcement copy tied to creator impact

## Event Instrumentation by Screen

## 1. `/` Home
Emit:
- `creator_onboarding_started`
- `decision_intent_prompt_viewed`
- `creator_clicked_start`

Payload:
- `session_id`
- `utm_source`
- `entry_variant`

## 2. `/admin/questionnaires` + `/admin/questionnaires/v1`
Emit:
- `decision_intent_selected`
- `prompt_template_selected`
- `survey_draft_saved`
- `survey_published`
- `share_link_copied`

Payload:
- `survey_id`
- `intent_type`
- `template_pack`
- `question_count`

## 3. `/questionnaire` + `/questionnaire/v1`
Emit:
- `respondent_started`
- `response_recording_started`
- `response_recording_submitted`
- `response_duration_bucketed`
- `respondent_completed`

Payload:
- `survey_id`
- `question_id`
- `duration_seconds`
- `duration_bucket` (`short`/`medium`/`deep`)

## 4. `/admin/dashboard` (v4)
Emit:
- `response_inbox_opened`
- `first_response_viewed`
- `response_replayed`
- `response_bookmarked`
- `creator_returned_within_7d`

Payload:
- `survey_id`
- `response_id`
- `replay_count`
- `bookmark_action` (true/false)

## 5. `/admin/notifications`
Emit:
- `notification_rule_toggled`
- `notification_template_saved`
- `test_email_sent`
- `notification_opened`

Payload:
- `rule_name`
- `enabled`
- `template_type`
- `delivery_channel`

## 6. `/questionnaire/thank-you`
Emit:
- `respondent_thank_you_viewed`
- `respondent_follow_up_action`

Payload:
- `action_type` (`return_home`/`answer_another`)

## Metric Computation Rules

1. TTFR:
- `ttfr = first(response_recording_submitted.timestamp) - survey_published.timestamp`

2. % responses > 20 seconds:
- Numerator: responses with `duration_seconds > 20`
- Denominator: all `response_recording_submitted`

3. Creator revisit rate:
- Creator opens response inbox >=2 times in rolling 7-day window.

4. Forms per creator:
- Count `survey_published` per `creator_id` per 30 days.

## Acceptance Criteria (Per Layer)

### Trigger
- Creator setup flow includes decision intent capture.
- At least one template pack is selectable before publish.

### Action
- Recorder supports start/stop/playback/re-record with clear state.
- Respondent sees duration guidance and save confirmation.

### Reward
- Dashboard visibly highlights first response event.
- Most replayed and average duration surfaces render for every active survey.

### Reinforcement
- Notification toggles persist and test email succeeds.
- Thank-you page presents at least one explicit next action.

## QA Checklist

Functional:
1. Publish survey -> link works.
2. Submit response -> appears in dashboard.
3. Replay + bookmark actions persist.
4. Notification test email returns success.

Behavioral:
1. Decision-intent copy appears before question composition.
2. Respondent receives depth cue before recording.
3. Creator sees first-response event without manual digging.

Accessibility:
1. Forms labeled and errors associated.
2. Keyboard navigation across key actions.
3. Focus visible on all interactive controls.

## Rollout Sequence
1. Instrumentation stubs and shared analytics helper.
2. Trigger + Action implementations.
3. Reward surfaces in dashboard.
4. Reinforcement notifications + completion momentum.
5. Baseline/accessibility pass.
6. Beta launch with weekly metric review.

## Weekly Review Template
1. TTFR median (current vs prior week)
2. % responses > 20s
3. Creator revisit rate
4. Forms per creator
5. Top 3 friction events
6. One behavior-focused experiment for next week
