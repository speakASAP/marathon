# EP-TASK-MAR-065: Minimize Persisted Payment Provider Payloads

```yaml
id: EP-TASK-MAR-065
status: implemented
source_task: ../11_tasks/TASK-MAR-065-payment-ledger-payload-minimization.md
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-15
completeness_level: implemented
vision: ../01_vision/VISION.md
constitution: ../00_constitution/CONSTITUTION.md
feature: ../10_features/FEAT-001-launch-ready-catalog-flow.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-MAR-065.md
```

## Metadata

Target environment: local static/build validation first, then credentialed production-safe smoke. Lifecycle state: deployed.

## Upstream Traceability

- Constitution: `../00_constitution/CONSTITUTION.md`
- Vision: `../01_vision/VISION.md`
- System: `../04_systems/SYS-001-marathon-platform.md`
- Subsystem: `../05_subsystems/SUB-002-vip-payments.md`
- ADR: `../07_decisions/ADR-003-payment-attempt-ledger.md`
- Sensitive-data policy: `../23_documentation_contracts/SENSITIVE_DATA_POLICY.md`

## Goal Impact

Minimize sensitive payment-provider retention while preserving payment-attempt auditability.

## Project Invariants

MAR-INV-004 must remain intact: VIP unlock requires payment-attempt match or valid unused gift redemption.

## Sensitive-Data Handling

No secrets, checkout URLs, raw provider payloads, JWTs, gift-code values, or full contact details may be committed to docs, tests, logs, or validation reports.

## Contract Validation Plan

Read-only review of remote payments-microservice source on 2026-06-14 verified the fields Marathon can rely on for payload minimization. Checkout create success returns `success` plus `data.paymentId`, `data.status`, `data.redirectUrl`, and `data.expiresAt`. Outbound consumer callbacks return `paymentId`, `orderId`, `status`, `paymentMethod`, `event`, `timestamp`, and `metadata` containing the original checkout metadata plus `providerTransactionId`.

Marathon-created checkout metadata currently includes `marathonerId`, `participantId`, `marathonId`, `productId`, and `userId`. The callback source reviewed does not include top-level `amount` or `currency`, so TASK-MAR-065 must preserve local ledger amount/currency fields and must not depend on callback amount/currency being present.

Production smoke on 2026-06-15 surfaced the payments-microservice create-path requirement for an `Idempotency-Key`; Marathon now sends the checkout `orderId` as that header.

## Replay/Determinism Plan

Unit/static validation is deterministic. Credentialed smoke is not replay-safe and must use approved synthetic inputs; the approved 2026-06-15 run passed.

## Scope

`src/vip/vip.service.ts` persisted checkout/callback JSON minimization only, plus targeted tests or smoke assertions.

## Parallel Execution Model

| Field | Value |
|---|---|
| Parallel goal lane | E: VIP/payment/gift hardening |
| Can start in parallel with | Frontend route work if it avoids `src/vip/`; read-only evidence after merge sequencing |
| Must wait for | Fresh approval before any future live runtime proof |
| Blockers | None for TASK-MAR-065 closure |
| Safe follow-up work | TASK-MAR-065 closure complete |
| File ownership boundary | `src/vip/vip.service.ts`, targeted tests, validation docs |
| Shared files requiring coordination | `prisma/schema.prisma` only if schema changes are proposed; none expected |
| Merge order | Deployed after serialized TASK-MAR-065/066 `src/vip/vip.service.ts` integration |
| Validation owner | Engineering |

## Parallelization Decision

This should not run concurrently with other edits to payment settlement code. It can run in parallel with unrelated frontend and operations lanes.

## Provider Contract Evidence

- Source reviewed: remote payments-microservice repository via `ssh alfares`.
- Files reviewed: create payment DTO, payment entity, payments controller, payments service, webhooks service, and the payment contract matrix.
- Sensitive-data boundary: no `.env`, secret values, raw provider payload dumps, production logs, checkout URLs from live traffic, JWTs, participant rows, emails, or gift-code values were read or recorded.
- Verified create response fields: `success`, `data.paymentId`, `data.status`, `data.redirectUrl`, `data.expiresAt`.
- Verified live create requirement: `Idempotency-Key` header; Marathon uses checkout `orderId`.
- Verified callback fields: `paymentId`, `orderId`, `status`, `paymentMethod`, `event`, `timestamp`, `metadata`, and `metadata.providerTransactionId`.
- Verified Marathon metadata echoed by contract path: `metadata.marathonerId`, `metadata.participantId`, `metadata.marathonId`, `metadata.productId`, `metadata.userId`.
- Verified absence: outbound callback payload does not include top-level `amount` or `currency`.

## Non-Goals

Do not alter gift redemption, UI handoffs, registration, product pricing, or the payment-attempt matching invariant.

## Files to Inspect

- `src/vip/vip.service.ts`
- `src/vip/vip.controller.ts`
- `prisma/schema.prisma`
- `scripts/run-production-smoke-safe.js`
- `scripts/check-marathon-journey.js`

## Files to Create

- `scripts/check-payment-callback-hardening.js`

## Files to Modify

- `src/vip/vip.service.ts`
- `scripts/run-production-smoke-safe.js`
- `docs/intent/12_validation/VAL-TASK-MAR-065.md`
- `docs/intent/12_validation/VAL-PAR-005-vip-payment-gift-review.md`

## Files That Must Not Be Modified

- `docs/intent/00_constitution/CONSTITUTION.md`
- `docs/intent/01_vision/VISION.md`
- Unrelated frontend routes and catalog migration scripts.

## Implementation Steps

1. Identify the minimal persisted checkout summary fields.
2. Identify the minimal persisted callback summary fields.
3. Add redaction/minimization helpers in `VipService`.
4. Preserve provider payment ID extraction and callback matching behavior.
5. Validate with syntax/build checks and targeted settlement cases.

## Parallel Agent Handoff

- Agent/session scope: payment ledger payload minimization only.
- Owner role: backend payment-hardening implementation agent.
- Allowed runtime files: `src/vip/vip.service.ts` and focused payment tests or synthetic harness selected by the implementation agent.
- Allowed documentation files after implementation: `docs/intent/12_validation/VAL-TASK-MAR-065.md`.
- Forbidden files: schema migrations, frontend routes, pricing/catalog/gift code behavior, secrets, raw provider payload fixtures, checkout URLs, JWTs, participant rows/emails/full IDs.
- Inputs to provide: this execution plan, `TASK-MAR-065`, ADR-003, `SUB-002`, `SENSITIVE_DATA_POLICY`, and the provider contract evidence above.
- Expected output: narrow patch replacing raw persisted checkout/callback JSON with allowlisted summaries while preserving `providerPaymentId`, order matching, amount/currency ledger fields, status, event, and idempotency behavior.
- Coordination note: do not edit `src/vip/vip.service.ts` concurrently with TASK-MAR-066 or TASK-MAR-067; do not run live mutating smoke without approved credentials.
- Merge order: TASK-MAR-065 may merge before TASK-MAR-066 if it only changes persisted payload summaries and preserves existing callback behavior; otherwise integrate after the 066 contract decision.

## Test Plan

- `npm run build`
- `node scripts/check-payment-callback-hardening.js`
- `node --check scripts/run-production-smoke-safe.js`
- Targeted payment callback tests or a scripted local smoke for success, non-success callback, mismatched participant, mismatched product, mismatched amount, mismatched currency, and idempotent confirmed callback.
- Credentialed production-safe smoke passed on 2026-06-15 after approval.

## Validation Plan

Record masked evidence only. Do not include provider payloads, checkout URLs, JWTs, webhook keys, gift-code values, or full IDs.

## Gate Commands

Completed gates: `node scripts/check-payment-callback-hardening.js`, `node --check scripts/run-production-smoke-safe.js`, `npm run build`, remote deploy `task-mar-065-066-idempotency-20260615`, readiness check, public user-flow smoke, and production-safe payment/gift/winner/NPS smoke.

## Documentation Updates

Updated `12_validation/VAL-TASK-MAR-065.md` after implementation.

## Rollback Plan

Revert to raw payload persistence only if settlement compatibility is broken and record the residual sensitive-data risk.

## Agent Handoff Prompt

Implement TASK-MAR-065 using the verified payments-microservice contract recorded in this plan. Keep ADR-003 matching intact, persist only allowlisted checkout/callback summaries, and mask all validation evidence.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Blockers documented
