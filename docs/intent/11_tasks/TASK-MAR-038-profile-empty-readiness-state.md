# TASK-MAR-038: Profile Empty Readiness State

```yaml
id: TASK-MAR-038
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: production-verified
upstream:
  - docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
validation:
  - docs/intent/12_validation/VAL-TASK-MAR-038.md
```

## Objective

Make the empty participant profile dashboard respect Marathon readiness before inviting a logged-in user to start a new marathon.

## Goal Impact

This improves the registered-user journey while catalog data is absent. A user with no Marathon records should see registration-status/support actions when registration is closed, not a generic registration prompt.

## Scope

- Fetch `/api/v1/marathons/readiness` on `/profile`.
- Render readiness-loading, closed-registration, readiness-error, and open-registration copy in the empty profile state.
- Keep unauthenticated profile behavior unchanged.
- Add journey smoke coverage for the readiness-aware empty profile copy.

## Non-Goals

- Do not change authenticated profile API behavior.
- Do not create participant or catalog data.
- Do not run mutating registration/payment/gift/assignment checks.

## Acceptance Criteria

- [x] Empty profile state does not promise registration while `registrationOpen` is false.
- [x] Empty profile state links to registration status and support while registration is closed.
- [x] Open-registration copy remains available for future ready catalogs.
- [x] Journey smoke reports `profile-empty-readiness-state` before the expected catalog-readiness gate.
- [x] Validation evidence avoids JWTs, participant private data, payment secrets, gift-code values, and assignment reports.

## Verification

- Implemented in commit `912ec01` and deployed as image `localhost:5000/marathon:912ec01`.
- Production pod serves `/assets/index-DA4QfQkS.js`; the bundle contains `Checking registration status before showing registration actions`, `Registration is not open yet`, and `Статус регистрации`.
- In-pod `npm run check:journey` reports `[PASS] profile-empty-readiness-state` before the expected `[FAIL] catalog-readiness` gate.
- Browser QA verified `/profile?qa=912ec01` still renders the unauthenticated login guard without a framework overlay, and `/register?qa=912ec01` renders the closed-registration status with missing launch gates. The closed-registration support action navigates to `/support`.
- Authenticated empty-profile rendering is not production-browser verified because no safe production auth fixture with an empty marathon list is available; the shipped bundle and smoke check cover the readiness-aware copy and actions without exposing tokens or participant data.

## Sensitive-Data Classification

Low. This is public/readiness copy plus guarded profile shell behavior. Do not record tokens or private participant records.
