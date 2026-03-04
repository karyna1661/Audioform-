---
name: workflow-orchestration
description: Coordinate non-trivial work using explicit planning, verification, progress tracking, and lessons capture. Use when a task spans multiple steps, skills, or architectural decisions.
---

# Workflow Orchestration

Use this skill to coordinate complex work with discipline and clear checkpoints.

## 1. Plan Mode Default
- Enter plan mode for any non-trivial task (3+ steps or architectural decisions).
- If work drifts, stop and re-plan instead of pushing forward.
- Include verification steps in the plan, not just implementation.
- Write detailed specs up front to reduce ambiguity.

## 2. Subagent Strategy
- Use specialized skills to keep context focused.
- Offload research/exploration in parallel when possible.
- For complex tasks, increase parallel analysis before coding.
- Stack per-subtask focused execution.

## 3. Self-Improvement Loop
- After user corrections, update `tasks/lessons.md` with a preventive rule.
- Turn mistakes into reusable operating rules.
- Revisit relevant lessons at session start.

## 4. Verification Before Done
- Never mark complete without proof.
- Compare behavior before/after when relevant.
- Ask: "Would a staff engineer approve this?"
- Run tests/checks and inspect logs.

## 5. Demand Elegance (Balanced)
- For non-trivial changes, pause and ask if there is a cleaner solution.
- If a fix is hacky, replace it with an elegant implementation.
- Keep simple fixes simple; avoid overengineering.
- Challenge your own output before presenting.

## 6. Autonomous Bug Fixing
- Given a bug report, investigate and fix directly.
- Use logs, errors, and failing checks as primary signals.
- Minimize user context switching.
- Resolve failing CI/tests without waiting for additional prompting.

## Task Management
1. Plan first: add checkable items to `tasks/todo.md`.
2. Verify plan with current code context before edits.
3. Track progress by marking items complete.
4. Explain changes at each major step.
5. Document results in `tasks/todo.md` review section.
6. Capture lessons in `tasks/lessons.md` after corrections.

## Core Principles
- Simplicity first: smallest effective change.
- No laziness: fix root causes over temporary patches.
- Minimal impact: touch only what is necessary.
