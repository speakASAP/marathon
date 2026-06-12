# TASK-MAR-045: Extract Typed Public Marathon API Helper

```yaml
id: TASK-MAR-045
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-044-closed-catalog-how-gate.md
```

## Objective

Reduce duplicated public frontend API parsing by extracting typed helpers for Marathon landing data and moving the language landing page onto those helpers without changing catalog gates or user-facing behavior.

## Scope

- Add shared public frontend types for Marathon summary, language list, catalog readiness, and reviews.
- Add fetch helpers for public language, readiness, active-marathon, and review endpoints.
- Refactor `Landing.tsx` to consume the shared helper instead of inline endpoint parsing.
- Rebuild static frontend assets and verify existing journey smoke coverage still protects the closed-catalog states.

## Non-Goals

- Do not open registration without approved catalog data.
- Do not change registration, payment, gift, assignment, or review API semantics.
- Do not invent course, price, gift, participant, or assignment data.
- Do not refactor every page in the same slice.

## Acceptance Criteria

- [x] `Landing.tsx` imports shared typed helpers instead of declaring duplicate public endpoint interfaces and inline fetch chains.
- [x] `npm run build:frontend` passes.
- [x] `npm run check:journey` still passes landing/readiness/frontend checks before the known `catalog-readiness` blocker.
- [x] Production deployment serves the refactored bundle.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-045.md`.

## Current Blocker

The full registration, payment, gift, and assignment mutation journey remains blocked by missing source-owner approved catalog rows and explicit test inputs. This refactor improves frontend maintainability before that data load.
