# TASK-MAR-052: Add Public Winners and Support-Step Load-Error States

```yaml
id: TASK-MAR-052
status: verified
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-051-winners-support-api-helper.md
```

## Objective

Make remaining public detail/list routes production-safe under API failures by distinguishing temporary load failures from legitimate empty or not-found states.

## Scope

- Add explicit load-error states to `frontend/src/pages/Winners.tsx`.
- Add explicit load-error state to `frontend/src/pages/WinnerDetail.tsx`.
- Add explicit load-error state to `frontend/src/pages/SupportStep.tsx`.
- Preserve existing winners empty state, winner not-found state, support-step not-found state, and support-step missing-content state.
- Extend `scripts/check-marathon-journey.js` to protect the new bundle markers.
- Rebuild static frontend assets and run read-only journey smoke.

## Non-Goals

- Do not change winners, support-step, step, assignment, or catalog API semantics.
- Do not invent winner, review, step, or assignment content.
- Do not run mutating registration/payment/gift/assignment checks without approved catalog rows and authenticated smoke inputs.
- Do not expose participant, token, gift, payment, or private report data in validation artifacts.

## Acceptance Criteria

- [x] Winners page has an explicit route-level load-error state.
- [x] Winner detail distinguishes temporary load failure from winner not found.
- [x] Support step distinguishes temporary load failure from step not found and missing assignment content.
- [x] `npm run build:frontend` passes.
- [x] `npm run check:journey` includes and passes the new public detail load-error bundle assertion before the known `catalog-readiness` blocker.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-052.md`.

## Current Blocker

Live populated winners and support-step proof still requires approved catalog data, completed participants, and real assignment content.
