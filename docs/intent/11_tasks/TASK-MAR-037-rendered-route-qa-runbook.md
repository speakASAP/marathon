# TASK-MAR-037: Rendered Route QA Runbook

```yaml
id: TASK-MAR-037
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
validation:
  - docs/intent/12_validation/VAL-TASK-MAR-037.md
```

## Objective

Make rendered-route validation an explicit support-runbook step so Marathon frontend release confidence does not depend only on minified bundle string checks.

## Goal Impact

This advances production readiness by documenting and protecting the exact catalog-independent routes operators must visually verify before launch: home, language landing, registration, gift, profile, and assignment.

## Scope

- Add a rendered-route QA checklist to `/support`.
- Include expected visible states for closed-catalog or guarded routes.
- Add journey-smoke coverage that fails if the rendered-route QA checklist is missing from the built bundle.
- Validate production `/support` and key route states in Browser QA.

## Non-Goals

- Do not add new browser dependencies to the production pod.
- Do not replace all bundle-string checks in `check:journey` in this slice.
- Do not run mutating registration, payment, gift, or assignment checks without approved catalog/test inputs.

## Acceptance Criteria

- [x] `/support` renders `Rendered route QA checklist`.
- [x] Checklist covers `/`, `/en/`, `/register`, `/gift`, `/profile`, and `/steps/<step-id>?marathonerId=<participant-id>`.
- [x] Journey smoke reports `rendered-route-qa-ui` before the expected catalog-readiness gate.
- [x] Browser QA validates production `/support` checklist plus representative closed-catalog/guarded routes.
- [x] Validation evidence avoids JWTs, gift-code values, participant private data, payment secrets, and assignment report payloads.

## Validation Summary

- `npm run build:frontend` passed and emitted the production asset bundle.
- Production deployed `localhost:5000/marathon:0a3c0d5`.
- In-pod read-only journey smoke reported `[PASS] rendered-route-qa-ui` before the expected `[FAIL] catalog-readiness` gate.
- Browser QA on `/support?qa=rendered-0a3c0d5-checklist` confirmed the checklist and all six route targets render.
- Browser QA covered `/`, `/en/`, `/register`, `/gift`, `/profile`, and `/steps/smoke-step?marathonerId=smoke-participant` visible states without a framework overlay.

## Sensitive-Data Classification

Low for public route QA. Do not record private participant identifiers or tokens when validating guarded routes.
