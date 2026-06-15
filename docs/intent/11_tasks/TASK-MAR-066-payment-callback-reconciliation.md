# TASK-MAR-066: Complete Payment Callback Reconciliation

```yaml
id: TASK-MAR-066
status: implemented
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-15
completeness_level: implemented
upstream:
  - ../01_vision/VISION.md
  - ../04_systems/SYS-001-marathon-platform.md
  - ../05_subsystems/SUB-002-vip-payments.md
  - ../07_decisions/ADR-003-payment-attempt-ledger.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-MAR-066.md
execution_plan:
  - ../21_execution_plans/EP-TASK-MAR-066.md
validation:
  - ../12_validation/VAL-TASK-MAR-066.md
```

## Objective

Make successful payment callbacks fail closed unless the callback can be reconciled to the issued checkout order by participant, product, amount, currency, and provider-payment identity rules.

## Upstream Links

- Vision: `01_vision/VISION.md`
- System: `04_systems/SYS-001-marathon-platform.md`
- Subsystem: `05_subsystems/SUB-002-vip-payments.md`
- ADR: `07_decisions/ADR-003-payment-attempt-ledger.md`

## Goal Impact

This protects VIP payment integrity by aligning implementation with ADR-003 before more payment features or smoke evidence are added.

## Project Invariant Impact

- MAR-INV-001: traceability before coding.
- MAR-INV-004: VIP unlock requires a verified payment-attempt match.
- MAR-INV-006: validation evidence before closure.
- MAR-INV-008: no secrets or raw participant/private payment artifacts in docs.

## Sensitive-Data Classification

Classification: sensitive.

Use synthetic callback payloads or masked guarded smoke only. Do not persist webhook keys, checkout URLs, provider payload dumps, gift-code values, JWTs, full IDs, emails, or report text.

## Contract/Schema Impact

Payment webhook contract impact. Read-only review on 2026-06-14 confirmed payments-microservice outbound callbacks include top-level `paymentId`, `orderId`, `status`, `paymentMethod`, `event`, `timestamp`, and `metadata` containing original checkout metadata plus `providerTransactionId`. For Marathon-created checkout requests, the metadata sent by Marathon includes `marathonerId`, `participantId`, `marathonId`, `productId`, and `userId`. The reviewed callback source does not include top-level `amount` or `currency`. No Prisma schema change is expected.

## Replay/Determinism Impact

Synthetic negative callback tests are replay-safe. Live payment proof is non-replay-safe and requires explicit guarded approval; the approved 2026-06-15 production-safe smoke passed.

## Scope

- `src/vip/vip.service.ts` success-callback validation.
- Focused synthetic tests for missing/mismatched participant, product, amount, currency, and provider payment ID.
- Masked validation evidence.

## Non-Goals

- Do not change gift redemption, registration, assignment, NPS, RunLayer, or frontend route polish.
- Do not run live mutating payment smoke without approved guarded inputs.

## Acceptance Criteria

- [x] Success callbacks missing required reconciliation fields cannot unlock VIP.
- [x] Mismatched participant, product, amount, currency, or provider payment ID is rejected.
- [x] Duplicate success callbacks for the same confirmed order remain idempotent when identifiers match.
- [x] Validation evidence is synthetic or masked.

## Required Context

- `src/vip/vip.service.ts`
- `src/vip/vip.controller.ts`
- `prisma/schema.prisma`
- `docs/intent/05_subsystems/SUB-002-vip-payments.md`
- `docs/intent/07_decisions/ADR-003-payment-attempt-ledger.md`
- `docs/intent/17_governance/PROJECT_INVARIANTS.md`

## Validation Task

Complete `12_validation/VAL-TASK-MAR-066.md` with command evidence and masked findings. Guarded production smoke passed on 2026-06-15 with masked evidence.

## Required Gates

Pre-coding gate, contract validation, sensitive-data scan, and deployment readiness before rollout.

## Provider Contract Blocker Status

Verified facts from remote payments-microservice source review:

- Product and participant reconciliation can use the echoed checkout metadata that Marathon already sends.
- Provider identity can use top-level `paymentId` for the payments-microservice payment UUID and `metadata.providerTransactionId` for the downstream provider transaction reference.
- Success state can use top-level `status` and `event`.
- Amount and currency are not present in the outbound callback payload reviewed on 2026-06-14.

Approved implementation path: on 2026-06-15, Marathon-side adapter fallback was approved for this task. Successful callbacks can use the guaranteed callback `paymentId` to fetch authoritative `amount` and `currency` from payments-microservice before VIP unlock when those fields are absent from the callback payload.

## Execution Plan Requirement

Execution is governed by `21_execution_plans/EP-TASK-MAR-066.md`. Implementation and deployed validation are complete for TASK-MAR-066; future live payment smoke remains guarded.
