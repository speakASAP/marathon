# TASK-MAR-047: Extract Typed Assignment API Helper

```yaml
id: TASK-MAR-047
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-026-assignment-content-submit-guard.md
```

## Objective

Reduce assignment-page complexity by moving step, saved-report, peer-report, and report-submission API calls into a typed helper while preserving participant auth, assignment-content, and saved-status guards.

## Scope

- Add `frontend/src/api/assignmentMarathon.ts`.
- Centralize assignment page API types for step metadata, random peer reports, saved submissions, and submit responses.
- Preserve `Step.tsx` UI behavior, login redirects, assignment-content submit blocking, and saved-status submit blocking.
- Rebuild static frontend assets and run read-only journey smoke.

## Non-Goals

- Do not change assignment submission API semantics.
- Do not create or infer assignment content.
- Do not run mutating submission smoke without approved catalog/test inputs.
- Do not change payment, gift, registration, or profile APIs.

## Acceptance Criteria

- [x] `Step.tsx` no longer owns raw endpoint parsing for step load, saved submission, peer report, or report submit.
- [x] Auth-required saved-submission and submit responses still preserve login handoff behavior.
- [x] Missing assignment content still blocks report submission.
- [x] `npm run build:frontend` passes.
- [x] `npm run check:journey` passes catalog-independent assignment guard checks before the known `catalog-readiness` blocker.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-047.md`.

## Current Blocker

Live assignment submission mutation proof still requires approved catalog rows, assignment content, a participant, and explicit auth inputs.
