# TASK-MAR-039: Readiness Step Content Count

```yaml
id: TASK-MAR-039
status: in_progress
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: draft
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
validation:
  - docs/intent/12_validation/VAL-TASK-MAR-039.md
```

## Objective

Align the public readiness API and pod readiness CLI step-content counts with the actual launch gate for approved assignment content.

## Goal Impact

The Marathon launch gate already requires every active step to have non-empty, trimmed `assignmentContent`. The displayed `stepsWithContent` count should use the same rule so operators and users do not see inflated readiness counts before catalog load or after a bad source-owner file.

## Scope

- Count `stepsWithContent` from trimmed non-empty assignment content in `/api/v1/marathons/readiness`.
- Count `stepsWithContent` the same way in `npm run check:readiness`.
- Preserve the existing readiness response shape and failure behavior.
- Record production validation evidence without participant data, gift-code values, JWTs, payment keys, or assignment report payloads.

## Non-Goals

- Do not load catalog data.
- Do not modify approved assignment content.
- Do not change registration/payment/gift/assignment launch gates beyond count accuracy.
- Do not touch unrelated catalog approval document edits already present in the worktree.

## Acceptance Criteria

- [ ] The public readiness API reports `stepsWithContent` using trimmed non-empty `assignmentContent`.
- [ ] The pod readiness CLI reports the same count.
- [ ] Backend build and script syntax checks pass.
- [ ] Production deploy succeeds.
- [ ] Read-only journey smoke still passes all pre-catalog checks and fails only at the expected catalog-readiness gate.

## Sensitive-Data Classification

Low. Evidence may include aggregate readiness counts and smoke check names only.
