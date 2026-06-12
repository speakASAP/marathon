# TASK-MAR-040: Public Support Participant Safety

```yaml
id: TASK-MAR-040
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: production-verified
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
validation:
  - docs/intent/12_validation/VAL-TASK-MAR-040.md
```

## Objective

Make `/support` safe for public participants by removing operator dashboard content, catalog load commands, smoke-test commands, JWT placeholders, and internal QA/runbook copy from the registered-user journey.

## Goal Impact

The public navigation links directly to `/support`. Participants need registration status, profile/login help, VIP/gift guidance, assignment guidance, and a support contact. Operator-only launch commands and analytics should not be part of the participant-facing experience.

## Scope

- Replace the public support route with participant-safe support/status content.
- Keep safe aggregate readiness status visible to explain why registration may be closed.
- Remove frontend calls to operational analytics and marathon step lists from `/support`.
- Update journey smoke coverage so it protects participant-safe support content and fails if operator markers are present in the built bundle.
- Preserve backend analytics/readiness APIs for internal and smoke use.

## Non-Goals

- Do not remove backend analytics APIs.
- Do not load catalog data.
- Do not change support-step routes in this task.
- Do not stage unrelated env/catalog-document edits already present in the worktree.

## Acceptance Criteria

- [x] `/support` renders participant-safe help and readiness status.
- [x] `/support` does not render operator dashboard metrics, catalog load commands, smoke-test commands, JWT placeholders, or QA runbook copy.
- [x] Journey smoke reports public support safety before the expected catalog-readiness gate.
- [x] Browser QA verifies the public support page as an unauthenticated visitor.
- [x] Validation evidence avoids JWTs, participant private data, payment secrets, gift-code values, and assignment report payloads.

## Verification

- Implemented in commits `5509e77` and `cca3224`; deployed as image `localhost:5000/marathon:cca3224`.
- `npm run build:frontend` passed and generated `/assets/index-DU1plsmi.js` plus `/assets/index-CdVG7hqy.css`.
- Generated JS includes `Marathon support`, `support-public-status`, `Profile and login`, `VIP access`, and `Assignments`.
- Generated JS does not include `Operational dashboard`, `Post-load journey verification`, `npm run load:catalog:pod`, `--auth-token <portal-jwt>`, `approved-smoke-gift-code`, or `support-runbook-command`.
- In-pod `npm run check:journey` reports `[PASS] support-public-participant-ui` and `[PASS] support-operator-markers-hidden` before the expected `[FAIL] catalog-readiness` gate.
- Browser QA on `https://marathon.alfares.cz/support?qa=cca3224` verified participant support content, closed-registration readiness status, no forbidden operator markers, no framework overlay, and no current-route console errors. Screenshot: `/private/tmp/marathon-support-public-cca3224.png`.

## Sensitive-Data Classification

Low. The page may show aggregate public readiness counts only. Do not record tokens, private participant data, payment details, gift-code values, or assignment reports.
