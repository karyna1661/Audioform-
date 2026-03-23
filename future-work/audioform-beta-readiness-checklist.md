# Audioform Beta Readiness Checklist

Last updated: 2026-03-21
Release gate: External beta is blocked until all `P0` items are complete and verified.

## Status Legend
- `Not Started`
- `In Progress`
- `Blocked`
- `Done`

## P0 (Must Ship Before External Beta)

| ID | Priority | Workstream | Requirement | Owner | Status | Verification / Test Case |
|---|---|---|---|---|---|---|
| P0-1 | P0 | Auth | Replace mock `localStorage` auth with real backend session auth. | Unassigned | Done | Login/logout/session refresh works across browser reloads; invalid session is rejected by server. |
| P0-2 | P0 | AuthZ | Enforce server-side authorization for admin pages and admin APIs. | Unassigned | Done | Non-admin user receives `403` for admin API calls even if client UI is bypassed. |
| P0-3 | P0 | Data | Persist surveys/questions/responses/bookmarks/notification rules/templates in database. | Unassigned | Done | Create survey -> submit responses -> reload/browser restart -> all data still present. |
| P0-4 | P0 | Inbox | Implement real response inbox/listening in Survey Stack (not mock cards). | Unassigned | Done | Dashboard lists real responses by survey and plays stored audio clips. |
| P0-5 | P0 | Classification | Categorize responses by `question_id` and `duration_bucket` using persisted response metadata. | Unassigned | Done | Each response row shows source question and bucket (`short`/`medium`/`deep`) from stored data. |
| P0-6 | P0 | Moderation | Build functional moderate queue with real actions (`flag`, `mark high signal`, replay) persisted to backend. | Unassigned | Done | Action on response persists and is reflected across dashboard + queue views. |
| P0-7 | P0 | Notifications | Persist notification settings/templates and trigger automatic creator notifications on new responses. | Unassigned | Done | New response event triggers notification based on saved rules; disabled rules suppress delivery. |
| P0-8 | P0 | Events | Complete event instrumentation and backend ingestion (including notifications + thank-you events). | Unassigned | Done | Event stream contains required events with schema-valid payloads in server store. |
| P0-9 | P0 | Ops | Add startup env validation and hardened error handling for SMTP/auth/data dependencies. | Unassigned | Done | Missing required env var fails fast with clear error; transient provider errors are logged/retried safely. |
| P0-10 | P0 | Recorder UX | Recorder playback state: play button toggles to pause and playback counter progresses. | Unassigned | Done | During playback, control icon is pause and elapsed timer increments until clip end. |
| P0-11 | P0 | Product Integrity | Remove or clearly label all mock/static production-facing metrics and timeline claims. | Unassigned | Done | No static fake metric text appears in beta unless visibly tagged as demo data. |

## P1 (Should Ship Soon After P0)

| ID | Priority | Workstream | Requirement | Owner | Status | Verification / Test Case |
|---|---|---|---|---|---|---|
| P1-1 | P1 | Conversion | Add responder -> creator CTA on thank-you page ("Create your own survey"). | Unassigned | Done | Thank-you page includes creator CTA and click-through rate is tracked. |
| P1-2 | P1 | Dashboard IA | Promote "Create new survey" to primary dashboard CTA; demote secondary utilities. | Unassigned | Done | Primary CTA visually dominant and reachable in first viewport on desktop/mobile. |
| P1-3 | P1 | Composer Logic | Intent mode updates starter decision prompts contextually. | Unassigned | Not Started | Switching intent updates starter prompt set without page reload. |
| P1-4 | P1 | Composer Cohesion | Define explicit mapping from intent mode -> action prompt flow defaults/suggestions. | Unassigned | Not Started | Selecting intent preselects suggested prompt pack and explains why. |
| P1-5 | P1 | IA Clarity | Clarify "Survey Stack" vs "Moderate Queue" with concise explanatory copy. | Unassigned | Done | New users can describe difference correctly in usability checks. |
| P1-6 | P1 | Compare UX | Hide/feature-flag `Compare` until it uses real survey data and decision utility is validated. | Unassigned | Done | Compare only visible when feature flag is enabled and data contract is satisfied. |

## Non-Negotiable Production Recommendations (Must Be Met)

The following six recommendations are mandatory before widening beta:
1. Real authentication with durable sessions.
2. Server-side authorization enforcement.
3. Persistent backend data model for core entities.
4. Automated notification pipeline with persisted rules/templates.
5. Complete analytics instrumentation with backend ingestion.
6. Environment validation + operational hardening for external dependencies.

## Beta Gate Checklist

- [ ] All `P0` items are marked `Done`.
- [ ] P0 verification test cases executed and documented.
- [ ] No mock data shown as real production insights.
- [ ] End-to-end creator + responder flow passes on desktop and mobile.
- [ ] Rollback and incident response notes documented for auth, DB, and email failures.

## Audit Notes (2026-03-21)

- `P0-1` is done via signed cookie sessions in `lib/server/auth-session.ts` and the auth API routes.
- `P0-2` is now enforced on the main admin APIs and paired with stricter client-side admin redirects.
- `P0-3` is effectively done for surveys, responses, moderation flags, bookmarks, and notifications; survey questions currently persist through survey metadata/event payloads rather than a dedicated questions table.
- `P0-8` is now complete: respondent, notification, thank-you, replay, moderation, and creator revisit events are wired into backend ingestion.
- `P0-9` is now complete: env gating remains in place and key provider paths now use timeout/retry plus structured error logging.
- `P0-11` is now complete: remaining static production-facing claims were removed from the visual command center timeline.
- `P1-6` is now complete via route redirects away from legacy compare pages.

## Execution Order (Recommended)
1. Auth/AuthZ foundation (`P0-1`, `P0-2`).
2. Data persistence + response inbox/moderation (`P0-3` to `P0-6`).
3. Notifications/events/ops hardening (`P0-7` to `P0-9`).
4. Recorder UX correction + mock removal (`P0-10`, `P0-11`).
5. P1 product polish and conversion optimization.

