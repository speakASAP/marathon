# TASK-MAR-016: Add Winners Page Empty State

```yaml
id: TASK-MAR-016
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the public winners page explain the current no-winners state instead of rendering an empty page after the winners API returns zero items.

## Scope

- Add a post-load empty state to `/winners`.
- Link visitors to registration status and support from the empty state.
- Add read-only journey smoke coverage for the winners empty-state bundle copy.

## Non-Goals

- Do not create winner records.
- Do not load catalog data.
- Do not change winner API semantics.

## Acceptance Criteria

- [x] `/winners` renders an empty-state explanation when `items=[]`.
- [x] Empty-state actions point to registration status and support.
- [x] `npm run check:journey` reports winners empty-state UI coverage.
- [x] Build, deploy, Browser QA, and validation evidence are recorded.
