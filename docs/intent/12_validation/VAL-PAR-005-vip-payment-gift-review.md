# VAL-PAR-005: VIP Payment Gift Review

```yaml
id: VAL-PAR-005
status: reviewed
upstream:
  - ../21_execution_plans/PARALLEL-AGENT-HANDOFF-2026-06-13.md
```

## Review Scope

Agent E reviewed VIP checkout, webhook settlement, gift redemption, profile/gift API handoffs, and smoke evidence behavior.

## Summary

Static PAR-005 review completed. Follow-up implementation now covers payment payload retention and strict callback reconciliation with guarded production smoke evidence; gift redemption failure paths remain separate.

## Upstream Goal

Preserve Marathon VIP/payment/gift integrity and participant-safe validation evidence under `SUB-002`.

## Files Reviewed

- `src/vip/vip.service.ts`
- `src/vip/vip.controller.ts`
- `frontend/src/api/profileMarathon.ts`
- `frontend/src/api/journeyMarathon.ts`
- `scripts/check-marathon-journey.js`
- `scripts/run-production-smoke-safe.js`
- `prisma/schema.prisma`
- `docs/intent/05_subsystems/SUB-002-vip-payments.md`
- `docs/intent/07_decisions/ADR-003-payment-attempt-ledger.md`
- `docs/intent/23_documentation_contracts/SENSITIVE_DATA_POLICY.md`

## Findings

## Criteria Checked

| Item | Result | Follow-up |
| --- | --- | --- |
| Checkout endpoint | Reviewed | Creates a ledger row before provider checkout and requires authenticated participant claim. No isolated runtime fix made. |
| Webhook settlement | Reviewed | Validates callback API key, order, participant, product metadata when present, amount, and currency before VIP unlock. No isolated settlement fix made. |
| Gift redemption | Reviewed | Uses a transaction and `updateMany` with `usedAt: null` to prevent reuse before unlocking VIP. No isolated gift fix made. |
| Profile/gift UI handoffs | Reviewed | API helpers preserve auth-required errors, checkout redirect validation, and gift redemption handoff. No unrelated frontend route changes made. |
| Journey smoke evidence | Fixed | `TASK-MAR-064` masks participant/order identifiers in mutating report context. |
| Payment provider payload retention | Deployed | `TASK-MAR-065` now persists allowlisted checkout/callback summaries instead of raw provider payloads; guarded production smoke passed with masked evidence. |
| Success callback reconciliation | Deployed | `TASK-MAR-066` now requires participant/product/provider plus amount/currency reconciliation before VIP unlock, using the approved payment-status adapter fallback when callback amount/currency are absent; guarded production smoke passed with masked evidence. |
| Gift redemption inactive/replay paths | Draft task created | `TASK-MAR-067` scopes inactive participant, used-code, cross-marathon, and concurrent redemption hardening with synthetic tests. |

## Blockers

- Future full runtime proof requires approved smoke credentials and must not persist JWTs, webhook keys, checkout URLs, gift-code values, full participant IDs, full order IDs, or participant report text.
- Payment payload minimization and callback reconciliation are deployed and validated by guarded production smoke from 2026-06-15.
- Live gift redemption proof requires an approved disposable gift code; synthetic tests remain safe to run without consuming production inventory.

## Issues Found

- Generic mutating journey evidence previously persisted raw participant/order identifiers; TASK-MAR-064 addresses this.
- Payment provider payload minimization now stores allowlisted summaries and excludes raw provider payload persistence.
- Successful callback reconciliation now uses the approved Marathon payment-status adapter fallback for callback amount/currency gaps; gift redemption inactive/replay handling requires narrow backend work before code changes.
- The production payments create path requires an `Idempotency-Key`; Marathon now sends checkout `orderId` as that header.

## Validation

Static validation and read-only smoke evidence are recorded in `VAL-TASK-MAR-064.md`. TASK-MAR-065 and TASK-MAR-066 deployed validation is recorded in their validation reports. Credentialed mutating proof was approved and passed on 2026-06-15 for payment callback reconciliation; future runs still require fresh approval.

## Recommendation

Accept PAR-005 as a review deliverable with TASK-MAR-065 and TASK-MAR-066 deployed. Implement TASK-MAR-067 as a separate hardening task before further gift runtime changes.

## Traceability Confirmation

This report validates PAR-005 and links the review findings back to the G5 VIP/payment/gift hardening lane.
