# Lessons

## Session Notes
- When a user points out design is only a recolor, move directly to structural redesign (layout + workflow), not visual adjustments.
- Keep alternatives as separate routes for fast user comparison and decision.
- After deleting `.next`, restart dev server cleanly to avoid stale static asset 404s.
- When users ask for stronger output, verify whether the bottleneck is positioning/copy clarity before changing layout again.

- UX abstraction rule: In user-facing notifications and admin UI labels, prefer human-readable survey titles over internal IDs (e.g., survey.title instead of survey.id).

- Runtime guard rule: If styling can regress due to bundler mode or CSS pipeline config, enforce a machine check (scripts.dev/build flags, globals.css import, tailwind/postcss chain) via regen-engine before deploy.
