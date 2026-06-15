# EP-TASK-MAR-066: Complete Payment Callback Reconciliation

```yaml
id: EP-TASK-MAR-066
status: implemented
source_task: ../11_tasks/TASK-MAR-066-payment-callback-reconciliation.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-15
completeness_level: implemented
vision: ../01_vision/VISION.md
constitution: ../00_constitution/CONSTITUTION.md
feature: ../10_features/FEAT-001-launch-ready-catalog-flow.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-MAR-066.md
```

## Metadata

Target environment: local synthetic/static validation first; production only after approved guarded smoke. Lifecycle state: deployed.

## Upstream Traceability

Vision -> `SYS-001` -> `SUB-002` -> ADR-003 -> `TASK-MAR-066` -> this execution plan -> context package -> coding prompt -> code -> validation.

## Goal Impact

Preserves payment integrity by making the successful webhook settlement contract explicit and testable.

## Project Invariants

Preserve MAR-INV-001, MAR-INV-004, MAR-INV-006, and MAR-INV-008.

## Sensitive-Data Handling

Classification: sensitive. Use synthetic test payloads and masked evidence only.

## Contract Validation Plan

Read-only payments-microservice review on 2026-06-14 confirmed successful outbound callbacks include top-level `paymentId`, `orderId`, `status`, `paymentMethod`, `event`, `timestamp`, and echoed `metadata` plus `metadata.providerTransactionId`. For Marathon-created checkouts, the echoed metadata includes `marathonerId`, `participantId`, `marathonId`, `productId`, and `userId` because Marathon sends those fields during checkout creation.

The reviewed payments-microservice callback code does not include top-level `amount` or `currency`. On 2026-06-15, the Marathon-side adapter fallback was approved: successful callbacks use the guaranteed callback `paymentId` to fetch authoritative amount/currency from payments-microservice before VIP unlock when the callback payload lacks those fields.

Production smoke on 2026-06-15 also confirmed the create path requires an `Idempotency-Key`; Marathon now sends the checkout `orderId` as that header before provider checkout creation.

## Replay/Determinism Plan

Synthetic negative tests are replay-safe. Guarded production smoke is optional and non-replay-safe; the approved 2026-06-15 run passed.

## Scope

Backend payment callback reconciliation only.

## Parallel Execution Model

| Field | Value |
|---|---|
| Parallel goal lane | G5 VIP/payment/gift hardening |
| Can start in parallel with | TASK-MAR-067 only if `src/vip/vip.service.ts` edits are sequenced |
| Must wait for | Fresh approval before any future live runtime proof |
| Blockers | None for TASK-MAR-066 closure |
| Safe follow-up work | TASK-MAR-066 closure complete |
| File ownership boundary | `src/vip/vip.service.ts`, focused payment tests, `VAL-TASK-MAR-066.md` |
| Shared files requiring coordination | `src/vip/vip.service.ts` with TASK-MAR-067 and TASK-MAR-065 |
| Merge order | Implemented after TASK-MAR-065 payload minimization in the same serialized `src/vip/vip.service.ts` edit |
| Validation owner | Backend payment-hardening agent |

## Parallelization Decision

Dependency-gated. It can be planned in parallel but should not edit `src/vip/vip.service.ts` concurrently with other VIP runtime tasks.

## Provider Contract Evidence

- Source reviewed: remote payments-microservice repository via `ssh alfares`.
- Files reviewed: create payment DTO, payment entity, payments controller, payments service, webhooks service, and the payment contract matrix.
- Sensitive-data boundary: no `.env`, secret values, raw provider payload dumps, production logs, checkout URLs from live traffic, JWTs, participant rows, emails, or gift-code values were read or recorded.
- Verified callback fields: `paymentId`, `orderId`, `status`, `paymentMethod`, `event`, `timestamp`, `metadata`, and `metadata.providerTransactionId`.
- Verified Marathon metadata echoed by contract path: `metadata.marathonerId`, `metadata.participantId`, `metadata.marathonId`, `metadata.productId`, `metadata.userId`.
- Verified absence: outbound callback payload does not include top-level `amount` or `currency`.

## Approved Adapter Path

Approved on 2026-06-15:

- Marathon requires successful callbacks to include participant metadata, product metadata, and provider payment identity.
- If callback `amount` and `currency` are present, Marathon validates them directly against the checkout ledger.
- If callback `amount` or `currency` is absent, Marathon uses callback `paymentId` to fetch payments-microservice status and validates returned `amount` and `currency` against the checkout ledger.

## Non-Goals

No gift redemption, frontend, catalog, registration, assignment, NPS, or RunLayer changes.

## Files to Inspect

- `src/vip/vip.service.ts`
- `src/vip/vip.controller.ts`
- `prisma/schema.prisma`
- `scripts/run-production-smoke-safe.js`

## Files to Create

- `scripts/check-payment-callback-hardening.js`

## Files to Modify

- `src/vip/vip.service.ts`
- `scripts/run-production-smoke-safe.js`
- `docs/intent/12_validation/VAL-TASK-MAR-066.md`

## Files That Must Not Be Modified

Frontend route polish files, migration scripts, raw secret files, and production data exports.

## Implementation Steps

1. Confirm the provider callback field contract.
2. Add strict success-callback reconciliation helpers.
3. Preserve idempotent same-order confirmed callback behavior.
4. Add synthetic negative tests.
5. Record masked validation.

## Parallel Agent Handoff

- Agent/session scope: backend payment callback hardening.
- Owner role: backend payment-hardening implementation agent.
- Allowed runtime files: `src/vip/vip.service.ts`, `scripts/run-production-smoke-safe.js`, and focused payment tests or synthetic harness selected by the implementation agent.
- Allowed documentation files after implementation: `docs/intent/12_validation/VAL-TASK-MAR-066.md`.
- Forbidden files: schema migrations unless a new approved plan is created, frontend routes, gift redemption behavior, pricing/catalog behavior, secrets, raw provider payload fixtures, checkout URLs, JWTs, participant rows/emails/full IDs.
- Inputs to provide: this execution plan, `TASK-MAR-066`, ADR-003, `SUB-002`, `SENSITIVE_DATA_POLICY`, provider contract evidence above, and the approved adapter path.
- Expected output: narrow patch making successful callbacks fail closed for missing/mismatched participant, product, provider payment identity, amount, and currency; duplicate confirmed callbacks remain idempotent when identifiers match.
- Coordination note: sequence shared `src/vip/vip.service.ts` edits with TASK-MAR-065 and TASK-MAR-067.
- Merge order: implemented in the same serialized `src/vip/vip.service.ts` edit after TASK-MAR-065 payload minimization.

## Test Plan

Run focused synthetic/static checks and `npm run build` if TypeScript source changes. Completed gates: `node scripts/check-payment-callback-hardening.js`, `node --check scripts/run-production-smoke-safe.js`, `npm run build`, remote deploy `task-mar-065-066-idempotency-20260615`, readiness check, public user-flow smoke, and production-safe payment/gift/winner/NPS smoke.

## Validation Plan

Update `VAL-TASK-MAR-066` with command evidence and masked results. Production-safe smoke passed with `paymentUnlock.status=vip_unlocked`, `paymentUnlock.profileType=vip`, and `paymentUnlock.ledgerStatus=confirmed`.

## Gate Commands

Manual pre-coding gate from `docs/intent/16_operations/PRE_CODING_GATE.md`; run available IPS audits when present.

## Documentation Updates

Update task and validation status after implementation.

## Rollback Plan

Revert the callback validation patch if legitimate provider callbacks fail, then record the contract mismatch.

## Agent Handoff Prompt

Implement TASK-MAR-066 with the approved Marathon-side amount/currency adapter path. Enforce complete success-callback reconciliation, add synthetic/static validation, and keep all validation evidence masked.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
