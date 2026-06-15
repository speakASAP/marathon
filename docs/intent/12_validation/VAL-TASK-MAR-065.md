# VAL-TASK-MAR-065: Payment Ledger Payload Minimization Validation

```yaml
id: VAL-TASK-MAR-065
status: complete
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-15
completeness_level: deployed-production-smoke
upstream:
  - ../11_tasks/TASK-MAR-065-payment-ledger-payload-minimization.md
downstream: []
related_adrs:
  - ../07_decisions/ADR-003-payment-attempt-ledger.md
```

## Summary

Implementation and production-smoke validation for minimized persisted payment provider checkout and callback payloads.

## Upstream Goal

Preserve payment-attempt auditability while reducing sensitive provider-payload retention.

## Criteria Checked

| Criterion | Result | Evidence |
|---|---|---|
| Checkout/callback summaries exclude checkout URLs and raw provider blobs | Pass | `node scripts/check-payment-callback-hardening.js` verified raw checkout/callback persistence patterns are absent and summary helpers exist. |
| Payment settlement matching remains intact | Pass | `npx tsc --noEmit --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --experimentalDecorators --skipLibCheck src/vip/vip.service.ts src/vip/vip.controller.ts` passed; `npm run build` passed. |
| Sensitive-data output stays masked | Pass | Implementation persists allowlisted summaries only and validation evidence records field names/statuses, not raw provider payloads, checkout URLs, secrets, JWTs, gift-code values, full IDs, emails, or report text. |
| Provider checkout/callback fields identified | Pass | Read-only source review of remote payments-microservice confirmed checkout success fields and outbound callback fields without reading secrets or raw production payloads. |
| Guarded production smoke passed | Pass | Remote deploy `task-mar-065-066-idempotency-20260615` passed readiness, public user-flow smoke, and production-safe payment/gift/winner/NPS smoke with masked evidence only. |

## Gate Evidence

Pre-coding gate: passed during implementation session.

Read-only contract review evidence:

- Reviewed remote payments-microservice source via `ssh alfares`.
- Reviewed source files only: create payment DTO/entity/controller/service, webhook callback service, and the existing payment contract matrix.
- Verified `POST /payments/create` success response fields: `success`, `data.paymentId`, `data.status`, `data.redirectUrl`, `data.expiresAt`.
- Verified live create path also requires Marathon to send checkout `orderId` as the `Idempotency-Key` header.
- Verified outbound callback fields: `paymentId`, `orderId`, `status`, `paymentMethod`, `event`, `timestamp`, `metadata`, and `metadata.providerTransactionId`.
- Verified Marathon-created checkout metadata echoed by callback path: `metadata.marathonerId`, `metadata.participantId`, `metadata.marathonId`, `metadata.productId`, and `metadata.userId`.
- Verified outbound callback payload does not include top-level `amount` or `currency`.

Deployment/runtime evidence:

- `node scripts/check-payment-callback-hardening.js`: pass.
- `node --check scripts/run-production-smoke-safe.js`: pass.
- `npm run build`: pass on remote Marathon repository.
- `./scripts/deploy.sh task-mar-065-066-idempotency-20260615`: pass.
- Production-safe smoke passed with masked evidence: `paymentUnlock.status=vip_unlocked`, `paymentUnlock.profileType=vip`, `paymentUnlock.ledgerStatus=confirmed`.
- Smoke safety flags confirmed no full IDs, gift-code value, JWT, or payment webhook key were printed.

## Invariant Evidence

MAR-INV-004 and MAR-INV-008 are primary.

## Sensitive-Data Scan Evidence

No provider payloads, checkout URLs, JWTs, webhook keys, gift-code values, full IDs, emails, report text, `.env` values, raw production logs, or production customer data were read or recorded.

## Replay and Determinism Evidence

Static/unit validation is replay-safe. Guarded production smoke was approved and completed on 2026-06-15; do not replay without fresh approval.

## Issues Found

Static PAR-005 review finding was confirmed before implementation: raw provider checkout and callback JSON were persisted in the payment attempt ledger, creating unnecessary sensitive-data retention risk.

2026-06-15 implementation replaced raw persisted checkout/callback JSON with allowlisted summaries in `src/vip/vip.service.ts`. Production smoke then surfaced the payments-microservice `Idempotency-Key` requirement; Marathon now sends the checkout `orderId` as that header and the guarded smoke passed.

## Recommendation

Accept deployed implementation closure. Future live payment smoke runs still require explicit guarded approval.

## Traceability Confirmation

This validation target supports TASK-MAR-065 and ADR-003.
