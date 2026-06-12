# TASK-MAR-048: Extract Typed Profile and Payment API Helper

```yaml
id: TASK-MAR-048
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-018-vip-checkout-redirect-validation.md
  - docs/intent/11_tasks/TASK-MAR-034-payment-webhook-fail-closed.md
```

## Objective

Reduce profile-detail complexity by moving Marathon profile loading, VIP checkout, progress report, and NPS feedback API calls into a typed helper while preserving payment-return, login, and support fallback behavior.

## Scope

- Add `frontend/src/api/profileMarathon.ts`.
- Centralize profile detail, checkout redirect, progress report, and NPS API types.
- Preserve profile not-found, unauthenticated login handoff, checkout redirect validation, progress report download, and NPS form behavior.
- Rebuild static frontend assets and run read-only journey smoke.

## Non-Goals

- Do not change checkout, payment callback, progress report, or NPS API semantics.
- Do not run mutating checkout/NPS/report generation without approved catalog and auth inputs.
- Do not change assignment, gift, registration, or catalog loader behavior.
- Do not expose participant, payment, token, gift, or private report data in validation artifacts.

## Acceptance Criteria

- [x] `ProfileDetail.tsx` no longer owns raw endpoint parsing for profile load, checkout, progress report, or NPS save.
- [x] Auth-required and not-found cases still preserve existing route states and login handoff.
- [x] Checkout redirect validation remains centralized and rejects missing/invalid redirect URLs.
- [x] `npm run build:frontend` passes.
- [x] `npm run check:journey` passes catalog-independent profile/payment/report/NPS checks before the known `catalog-readiness` blocker.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-048.md`.

## Current Blocker

Live checkout, payment settlement, progress report generation, and NPS mutation proof still require approved catalog rows, participant/auth inputs, and explicit mutating verification.
