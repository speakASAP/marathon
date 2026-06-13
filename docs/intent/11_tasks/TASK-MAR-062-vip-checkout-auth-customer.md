# TASK-MAR-062: Resolve VIP Checkout Customer Identity

```yaml
id: TASK-MAR-062
status: complete
owner: Engineering
created: 2026-06-13
completed: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
  - docs/intent/11_tasks/TASK-MAR-061-smoke-data-isolation.md
execution_plan: docs/intent/21_execution_plans/EP-TASK-MAR-062.md
validation: docs/intent/12_validation/VAL-TASK-MAR-062.md
sensitive_data: do not print JWTs, webhook keys, checkout URLs, payment secrets, gift codes, full IDs, emails, or report text
contract_impact: authenticated VIP checkout uses validated Auth user contact data when Marathon participant contact fields are empty
```

## Purpose

Phone-only Marathon registration is required for notification safety and smoke isolation, but VIP checkout still needs a customer email for payments-microservice. Checkout must use the authenticated user's validated Auth profile data without storing or printing sensitive values in validation evidence.

## Scope

- Carry `AuthUser` from `AuthGuard` into VIP checkout.
- Use Marathon participant contact fields first, then validated Auth token contact fields for checkout customer data.
- Keep checkout fail-closed when no email is available.
- Extend guarded production smoke to verify payment unlock in addition to gift, winner, finished-participant NPS, readiness, and journey checks.

## Acceptance Criteria

- [x] `npm run build` passes.
- [x] `node --check scripts/run-production-smoke-safe.js` passes.
- [x] Deployed production-safe smoke verifies checkout creation and payment webhook VIP unlock for a phone-only Marathon participant.
- [x] Smoke output remains masked and does not include JWTs, webhook key, checkout URL, gift code, email, full IDs, or report text.
- [x] Public readiness and read-only journey remain green after smoke.

## Result

Complete. Deployed commit image `localhost:5000/marathon:953b05d`, then guarded production-safe smoke passed with masked payment unlock evidence: checkout order created, Marathon webhook returned `vip_unlocked`, profile type became `vip`, and the payment ledger status was `confirmed`. Smoke isolation was also hardened to exclude synthetic `@example.invalid` participant emails from analytics and public winner filtering.
