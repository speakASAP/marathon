# TASK-MAR-051: Centralize Winners and Support-Step API Access

```yaml
id: TASK-MAR-051
status: verified
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-046-public-api-helper-expansion.md
  - docs/intent/11_tasks/TASK-MAR-047-assignment-api-helper.md
```

## Objective

Remove the remaining raw public page-level fetches from winners and support-step routes so rendered public surfaces use typed API helper boundaries before live catalog and winner data are loaded.

## Scope

- Extend `frontend/src/api/publicMarathon.ts` with typed winner page and winner detail helpers.
- Refactor `frontend/src/pages/Winners.tsx` and `frontend/src/pages/WinnerDetail.tsx` to consume the public helper.
- Refactor `frontend/src/pages/SupportStep.tsx` to reuse the typed `fetchStepInfo()` helper from `assignmentMarathon.ts`.
- Preserve winners empty state, winner not-found state, support-step not-found state, and assignment-content missing state.
- Rebuild static frontend assets and run read-only journey smoke.

## Non-Goals

- Do not change winners, medals, reviews, step, assignment, or support API semantics.
- Do not invent winner, review, step, or assignment content.
- Do not run mutating registration/payment/gift/assignment checks without approved catalog rows and authenticated smoke inputs.
- Do not expose participant, token, gift, payment, or private report data in validation artifacts.

## Acceptance Criteria

- [x] `Winners.tsx` no longer owns raw winners-page fetch/JSON parsing.
- [x] `WinnerDetail.tsx` no longer owns raw winner-detail fetch/JSON parsing.
- [x] `SupportStep.tsx` no longer owns raw step fetch/JSON parsing.
- [x] Existing empty/not-found/content-missing public states remain visible.
- [x] `npm run build:frontend` passes.
- [x] `npm run check:journey` passes catalog-independent winners and support/step assertions before the known `catalog-readiness` blocker.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-051.md`.

## Current Blocker

Live populated winners and support-step proof still requires approved catalog data, completed participants, and real assignment content.
