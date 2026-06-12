# TASK-MAR-034: Payment Webhook Fail-Closed Guard

```yaml
id: TASK-MAR-034
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
validation:
  - docs/intent/12_validation/VAL-TASK-MAR-034.md
```

## Objective

Make the VIP payment callback path fail closed when the runtime webhook secret is missing or the callback omits the configured API key, so VIP unlock cannot depend on permissive payment callback configuration.

## Goal Impact

This reduces risk in the production VIP upgrade path before approved catalog rows exist. The full VIP end-to-end task remains blocked by missing catalog/test inputs, but the callback acceptance contract becomes safer and independently verifiable.

## Scope

- Reject payment callbacks when `PAYMENT_WEBHOOK_API_KEY` is not configured.
- Keep the existing wrong-key rejection behavior.
- Add read-only journey smoke coverage that proves a callback without the API key returns HTTP 401 before catalog readiness.
- Record validation without payment secrets, JWTs, participant records, gift-code values, or provider payloads.

## Non-Goals

- Do not change checkout creation, gift redemption, product pricing, or provider callback payload mapping.
- Do not run a live mutating checkout or payment callback.
- Do not document the webhook secret value.

## Acceptance Criteria

- [x] `VipService` rejects callbacks if `PAYMENT_WEBHOOK_API_KEY` is absent.
- [x] `npm run check:journey` reports `payment-webhook-auth-guard` before the expected catalog-readiness gate.
- [x] Build and deployment complete without changing unrelated dirty files.
- [x] Validation report records only safe command/status evidence.

## Validation Summary

- `node --check scripts/check-marathon-journey.js` passed.
- `npm run build` passed.
- Remote read-only journey smoke reported `[PASS] payment-webhook-auth-guard` before the expected `[FAIL] catalog-readiness` gate.
- Production rollout evidence is recorded in `VAL-TASK-MAR-034`.

## Sensitive-Data Classification

Sensitive. Validation evidence must use only status codes, check names, commit hashes, and aggregate readiness state.
