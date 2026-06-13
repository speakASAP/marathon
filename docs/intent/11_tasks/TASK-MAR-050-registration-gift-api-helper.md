# TASK-MAR-050: Centralize Registration and Gift Action API Access

```yaml
id: TASK-MAR-050
status: verified
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-035-gift-readiness-loading-nav.md
  - docs/intent/11_tasks/TASK-MAR-046-public-api-helper-expansion.md
```

## Objective

Reduce registration and gift-redemption frontend complexity by moving the remaining raw mutation request parsing into a typed journey API helper while preserving the existing login handoffs, closed-catalog guards, and redirect behavior.

## Scope

- Add `frontend/src/api/journeyMarathon.ts`.
- Centralize `POST /api/v1/registrations` request construction, response parsing, auth-expired handling, and legacy redirect normalization.
- Centralize `POST /api/v1/vip/gift-redemptions` request construction, auth-required handling, response parsing, and error-body handling.
- Refactor `frontend/src/components/RegistrationForm.tsx` and `frontend/src/pages/Gift.tsx` to consume the helper.
- Rebuild static frontend assets and run read-only journey smoke.

## Non-Goals

- Do not change registration, gift redemption, checkout, payment callback, or assignment API semantics.
- Do not run mutating registration or gift checks without approved catalog rows and authenticated smoke inputs.
- Do not expose participant, token, gift-code, payment, or private report data in validation artifacts.
- Do not change the closed-catalog readiness gate behavior.

## Acceptance Criteria

- [x] `RegistrationForm.tsx` no longer owns raw registration fetch/JSON/error parsing.
- [x] `Gift.tsx` no longer owns raw gift-redemption `authFetch`/JSON/error parsing.
- [x] Registration still clears expired Marathon tokens and sends users through the portal login return path.
- [x] Registration success still routes token-bound users to `/profile/:marathonerId` and unauthenticated users through login.
- [x] Gift redemption still preserves participant return path on auth-required responses.
- [x] `npm run build:frontend` passes.
- [x] `npm run check:journey` passes catalog-independent registration and gift assertions before the known `catalog-readiness` blocker.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-050.md`.

## Current Blocker

Live registration and gift-redemption mutation proof still requires approved catalog rows, an unused gift code, and authenticated test participant inputs.
