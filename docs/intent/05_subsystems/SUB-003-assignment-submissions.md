# SUB-003: Assignment Submissions

```yaml
id: SUB-003
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
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
```

## Purpose

Allow authenticated participants to read assignment content, submit reports, reload saved reports, and see progress/late/bonus-day state.

## Responsibilities

- Render assignment content as plain text.
- Require profile participant context and JWT before report submission.
- Create/update participant submissions.
- Track late penalty and bonus-day behavior.
- Show active/completed/late/locked/VIP-gated schedule state.

## Interfaces

- `GET /api/v1/steps/:id`.
- `GET /api/v1/me/marathons/:marathonerId/submissions/:stepId`.
- `POST /api/v1/me/marathons/:marathonerId/submissions`.
- `/profile/:marathonerId`.
- `/steps/:stepId`.

## Dependencies

- Launch-ready catalog with approved `assignmentContent`.
- Auth-microservice JWT validation.
- Participant profile state.

## Data Ownership

Product Owner owns assignment content. Participant/system owns submitted reports and progress state.

## Failure Modes

- Missing assignment content blocks launch readiness.
- Missing auth blocks submission and preserves exact return path.
- Step not found and backend failure must be distinct UI states.

## Validation Criteria

- Saved report readback works for authenticated participant and explicit IDs.
- Mutating submission smoke checks require `--mutating`.
- Step content is rendered without HTML injection.
