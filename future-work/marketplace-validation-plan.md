# Voice Survey + Marketplace Validation Plan

## Goal
Validate demand for voice surveys first, then use data to decide whether a full survey marketplace is worth building.

## Phase 1: Core Product Validation (Now)
1. Ship the core loop: create survey -> share link -> collect voice responses -> basic insights.
2. Focus on admin and respondent experience reliability (recording, upload, completion flow).
3. Run 10-20 pilot creators and collect qualitative feedback.

## Phase 2: Lightweight Discovery Experiment (Not Full Marketplace)
1. After a user submits a survey, show 3-5 recommended surveys on a "What next?" screen.
2. Keep discovery simple: no payouts, no complex ranking, no public marketplace profiles.
3. Ensure recommendations prioritize active, high-quality, short surveys.

## Metrics to Track
1. `survey_completion_rate`
2. `drop_off_by_question`
3. `average_response_length`
4. `repeat_creator_rate`
5. `click_to_next_survey_rate`
6. `second_survey_start_rate`
7. `second_survey_completion_rate`

## Decision Gate
1. Continue to marketplace planning only if post-submit discovery shows strong pull (for example, 20-30%+ users start a second survey and quality remains high).
2. If not, improve core voice survey UX and creator outcomes before expanding scope.

## If Metrics Are Strong: Marketplace Phase
1. Design discovery and ranking rules.
2. Add trust and safety moderation workflows.
3. Add anti-spam and fraud controls.
4. Add incentive/payment design only after trust/safety baseline is stable.

## Scope Guardrails
1. Do not build a full marketplace before demand is validated.
2. Keep engineering focused on the shortest path to behavior signal.
3. Reassess every 2-4 weeks with usage data.
