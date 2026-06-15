# TASK-MAR-065: Minimize Persisted Payment Provider Payloads

```yaml
id: TASK-MAR-065
status: implemented
last_updated: 2026-06-15
upstream:
  - ../01_vision/VISION.md
  - ../04_systems/SYS-001-marathon-platform.md
  - ../05_subsystems/SUB-002-vip-payments.md
  - ../07_decisions/ADR-003-payment-attempt-ledger.md
  - ../23_documentation_contracts/SENSITIVE_DATA_POLICY.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-MAR-065.md
execution_plan:
  - ../21_execution_plans/EP-TASK-MAR-065.md
validation:
  - ../12_validation/VAL-TASK-MAR-065.md
```

## Status

Implemented, deployed, and validated with guarded production-safe smoke on 2026-06-15. Future live payment smoke remains guarded and requires fresh approval.

## Upstream Links

- Vision: `../01_vision/VISION.md`
- System: `../04_systems/SYS-001-marathon-platform.md`
- Subsystem: `../05_subsystems/SUB-002-vip-payments.md`
- ADR: `../07_decisions/ADR-003-payment-attempt-ledger.md`
- Sensitive-data policy: `../23_documentation_contracts/SENSITIVE_DATA_POLICY.md`

## Problem

`src/vip/vip.service.ts` stores provider checkout responses in `MarathonPaymentAttempt.checkoutResponse` and callback bodies in `MarathonPaymentAttempt.callbackPayload`. These raw payloads may include checkout redirect URLs, customer contact metadata, provider identifiers, or future provider fields that should not be broadly persisted if a smaller audit record is sufficient.

## Scope

- Define a provider-payload allowlist for persisted audit fields.
- Preserve settlement matching for order, participant, product, amount, currency, provider payment ID, status, and event.
- Store redacted/minimized checkout and callback summaries instead of raw provider payloads when safe.
- Add targeted tests or smoke assertions that settlement still fails closed on mismatched order/product/amount/currency.

## Non-Goals

- Do not change pricing, product selection, gift redemption, frontend route behavior, or provider integration secrets.
- Do not remove the payment-attempt ledger.
- Do not persist checkout URLs, webhook keys, JWTs, gift-code values, full contact details, or raw provider payloads in validation evidence.

## Acceptance Criteria

- Checkout creation still records a payment-attempt ledger row before provider request.
- Successful callbacks still require API key validation and matching order/product/amount/currency before VIP unlock.
- Persisted checkout/callback JSON excludes redirect URLs, customer contact fields, authorization material, and unknown raw provider blobs.
- Validation evidence uses masked IDs and status summaries only.

## Objective

Reduce sensitive-data retention in the payment ledger while preserving ADR-003 auditability and payment integrity.

## Goal Impact

Supports VG-002 payment integrity by keeping payment evidence auditable without retaining unnecessary sensitive provider data.

## Required Context

Read `src/vip/vip.service.ts`, `prisma/schema.prisma`, `ADR-003-payment-attempt-ledger.md`, `SUB-002-vip-payments.md`, and `SENSITIVE_DATA_POLICY.md` before implementation.

## Provider Contract Review

Read-only contract review on 2026-06-14 inspected remote payments-microservice source over the `alfares` SSH alias without reading secrets, live logs, raw provider payloads, or production customer data.

Verified checkout creation response for `POST /payments/create`:

- Success envelope: `success`.
- Response data: `data.paymentId`, `data.status`, `data.redirectUrl`, `data.expiresAt`.
- `data.paymentId` is the payments-microservice internal payment UUID and is currently the field Marathon extracts into `MarathonPaymentAttempt.providerPaymentId`.
- `data.redirectUrl` is a payment redirect URL and must not be persisted in Marathon ledger JSON.
- Marathon sends checkout `orderId` as the `Idempotency-Key` header required by payments-microservice.

Verified outbound consumer callback payload from payments-microservice:

- Top-level fields: `paymentId`, `orderId`, `status`, `paymentMethod`, `event`, `timestamp`.
- Metadata fields: all original checkout `metadata` values echoed back, plus `metadata.providerTransactionId`.
- For Marathon-created checkout requests, local Marathon code sends `metadata.marathonerId`, `metadata.participantId`, `metadata.marathonId`, `metadata.productId`, and `metadata.userId`.
- The callback payload does not include top-level `amount` or `currency` in the reviewed source.

Permitted Marathon ledger summaries should therefore preserve only non-secret reconciliation fields and status booleans. They must exclude checkout redirect URLs, callback URLs, customer contact fields, authorization headers, webhook keys, raw provider blobs, and unknown payload passthrough.

## Validation Task

Create or update validation evidence after implementation. Guarded production smoke passed on 2026-06-15 with masked evidence.

## Execution Plan Requirement

Execution is governed by `21_execution_plans/EP-TASK-MAR-065.md`. Implementation and deployed validation are complete for TASK-MAR-065.
