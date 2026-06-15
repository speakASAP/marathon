# VAL-TASK-MAR-066: Payment Callback Reconciliation Validation

```yaml
id: VAL-TASK-MAR-066
status: complete
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-15
completeness_level: deployed-production-smoke
upstream:
  - ../11_tasks/TASK-MAR-066-payment-callback-reconciliation.md
downstream: []
related_adrs:
  - ../07_decisions/ADR-003-payment-attempt-ledger.md
```

## Summary

Implementation and production-smoke validation for complete successful payment callback reconciliation.

## Upstream Goal

Protect VIP payment integrity under `SUB-002` and ADR-003.

## Criteria Checked

| Criterion | Result | Evidence |
|---|---|---|
| Missing participant/product/amount/currency/provider fields fail closed | Pass | `src/vip/vip.service.ts` now requires participant metadata, product metadata, provider payment ID, and amount/currency reconciliation before successful VIP unlock; static hardening check and TypeScript build passed. |
| Mismatched participant/product/amount/currency/provider fields fail closed | Pass | `src/vip/vip.service.ts` validates participant/product/provider IDs against the checkout ledger and validates callback or payment-status amount/currency against ledger amount/currency. |
| Duplicate confirmed callback remains idempotent | Pass | Strict reconciliation runs before the existing confirmed-attempt idempotent return path; matching confirmed callbacks return idempotently. |
| Sensitive-data output stays masked | Pass | Callback persistence now stores allowlisted summaries only and validation evidence is field/status based. |
| Provider callback participant/product/provider fields identified | Pass | Read-only source review confirmed outbound callback `metadata` echoes Marathon checkout metadata and includes `metadata.providerTransactionId`. |
| Provider callback amount/currency fields identified | Pass | Reviewed payments-microservice callback source does not include top-level `amount` or `currency`; approved Marathon adapter fallback fetches payment status by callback `paymentId`. |
| Guarded production smoke passed | Pass | Remote deploy `task-mar-065-066-idempotency-20260615` passed readiness, public user-flow smoke, and production-safe payment/gift/winner/NPS smoke with masked evidence only. |

## Gate Evidence

Pre-coding gate: passed during implementation session.

Read-only contract review evidence:

- Reviewed remote payments-microservice source via `ssh alfares`.
- Reviewed source files only: create payment DTO/entity/controller/service, webhook callback service, and the existing payment contract matrix.
- Verified outbound callback fields: `paymentId`, `orderId`, `status`, `paymentMethod`, `event`, `timestamp`, `metadata`, and `metadata.providerTransactionId`.
- Verified Marathon-created checkout metadata echoed by callback path: `metadata.marathonerId`, `metadata.participantId`, `metadata.marathonId`, `metadata.productId`, and `metadata.userId`.
- Verified outbound callback payload does not include top-level `amount` or `currency`.

Deployment/runtime evidence:

- `node scripts/check-payment-callback-hardening.js`: pass.
- `node --check scripts/run-production-smoke-safe.js`: pass.
- `npm run build`: pass on remote Marathon repository.
- `./scripts/deploy.sh task-mar-065-066-idempotency-20260615`: pass.
- Production-safe smoke passed the payment reconciliation path with masked evidence: `paymentUnlock.status=vip_unlocked`, `paymentUnlock.profileType=vip`, `paymentUnlock.ledgerStatus=confirmed`.
- Adjacent smoke assertions also passed: `participantFinished=true`, `vipUnlockedByGift=true`, winner created, and NPS row count remained one for the participant.
- Smoke safety flags confirmed no full IDs, gift-code value, JWT, or payment webhook key were printed.

## Invariant Evidence

MAR-INV-004 and MAR-INV-008 are primary.

## Sensitive-Data Scan Evidence

No webhook keys, checkout URLs, provider payloads, gift codes, JWTs, full IDs, emails, report text, `.env` values, raw production logs, or production customer data were read or recorded.

## Replay and Determinism Evidence

Static/synthetic validation is replay-safe. Guarded production smoke was approved and completed on 2026-06-15; do not replay without fresh approval.

## Issues Found

Static PAR-005 review finding: successful callback validation currently treats amount and currency as optional and only validates product metadata when present. First confirmation also does not reject a callback provider payment ID that differs from the checkout-created provider payment ID when one is already stored.

2026-06-15 implementation uses the approved Marathon adapter fallback: when callback amount/currency are absent, `paymentId` is used to fetch payment status from payments-microservice before VIP unlock. Production smoke passed after Marathon also sent the checkout `orderId` as the payments-microservice `Idempotency-Key` header.

## Recommendation

Accept deployed implementation closure. Future live payment smoke runs still require explicit guarded approval.

## Traceability Confirmation

This validation target preserves the VIP payment ledger intent from ADR-003.
