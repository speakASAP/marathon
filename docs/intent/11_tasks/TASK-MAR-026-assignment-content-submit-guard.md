# TASK-MAR-026: Assignment Content Submit Guard

```yaml
id: TASK-MAR-026
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-017-step-peer-empty-state.md
```

## Objective

Block assignment report submission when a Marathon step lacks approved assignment content, so the runtime submission path enforces the same launch-readiness rule as catalog validation and readiness preflight.

## Scope

- Disable the Step page report form when `assignmentContent` is missing.
- Show a support action in the report tab for missing assignment content.
- Reject authenticated submission API requests for steps without approved assignment content.
- Add journey smoke coverage for the frontend submit guard.

## Non-Goals

- Do not create or infer assignment content.
- Do not load catalog data.
- Do not change saved-report, peer-report, payment, or gift-code behavior.

## Acceptance Criteria

- [x] Frontend build passes.
- [x] Backend build passes.
- [x] Report submission UI is blocked when approved assignment content is missing.
- [x] Submission API rejects missing-content steps before progress is recorded.
- [x] Journey smoke reports `assignment-content-submit-guard` before the expected catalog-readiness gate.
