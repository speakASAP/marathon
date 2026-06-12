# TASK-MAR-014: Add Root Teaser Empty States

```yaml
id: TASK-MAR-014
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the public root landing page honest after the finalists API returns an empty list, instead of leaving a stale loading message in the closed-catalog state.

## Scope

- Replace post-load finalists loading text with a clear empty-state message.
- Replace post-load reviews loading text with a clear empty-state message if reviews are unavailable.
- Add read-only journey smoke coverage for the root teaser empty-state bundle strings.

## Non-Goals

- Do not load catalog data.
- Do not create winners, reviews, participants, or progress data.
- Do not change winner or review API semantics.

## Acceptance Criteria

- [x] Root landing finalists teaser no longer shows `Загрузка…` after the empty winners response resolves.
- [x] Root landing reviews teaser has a post-load empty state if reviews are unavailable.
- [x] `npm run check:journey` reports root teaser empty-state coverage.
- [x] Build, deploy, Browser QA, and validation evidence are recorded.
