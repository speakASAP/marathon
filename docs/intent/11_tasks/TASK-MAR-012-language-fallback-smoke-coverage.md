# TASK-MAR-012: Add Language Fallback Smoke Coverage

```yaml
id: TASK-MAR-012
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the read-only journey smoke verifier protect language landing pages while production catalog data is absent.

## Scope

- Verify a language landing route serves the frontend shell before catalog readiness.
- Verify an empty or absent active-marathon API response is treated as a closed-catalog state.
- Keep checks read-only and runnable before catalog data exists.

## Non-Goals

- Do not load catalog data.
- Do not invent language course content.
- Do not open registration.
- Do not add browser automation to the in-pod smoke script.

## Acceptance Criteria

- [x] `npm run check:journey` reports `frontend-language-fallback-shell`.
- [x] `npm run check:journey` reports the no-active language marathon API shape.
- [x] Browser QA confirms `/en/` hydrates from loading state to the closed-catalog landing.
- [x] The smoke still stops at the expected `catalog-readiness` gate while production catalog data is absent.
