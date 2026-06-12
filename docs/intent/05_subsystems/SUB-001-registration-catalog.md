# SUB-001: Registration Catalog

```yaml
id: SUB-001
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/04_systems/SYS-001-marathon-platform.md
downstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
```

## Purpose

Control the approved Marathon catalog that determines public registration, language availability, step schedule, assignment content, VIP product availability, and gift readiness.

## Responsibilities

- Load only approved catalog entities.
- Reject user/progress data.
- Validate launch-ready shape before public registration opens.
- Explain closed-catalog state through public readiness API and UI.

## Interfaces

- `npm run load:catalog -- <file>` dry run.
- `npm run load:catalog -- <file> --apply` create-only apply.
- `/api/v1/marathons/readiness`.
- `/api/v1/registrations`.

## Dependencies

- Prisma schema.
- `scripts/load-marathon-catalog.js`.
- `scripts/check-marathon-readiness.js`.

## Data Ownership

Product Owner owns approved catalog values. Engineering owns loader validation.

## Failure Modes

- Missing active marathon keeps registration closed.
- Missing product/gift/steps/assignment content blocks launch readiness.
- Unsafe full-export input is rejected.

## Validation Criteria

- Catalog loader rejects participant/progress/winner/payment keys.
- Readiness reports missing catalog classes.
- Registration rejects non-launch-ready language catalog.
