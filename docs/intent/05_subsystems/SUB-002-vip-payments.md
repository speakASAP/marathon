# SUB-002: VIP Payments and Gift Access

```yaml
id: SUB-002
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/04_systems/SYS-001-marathon-platform.md
downstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-003-payment-attempt-ledger.md
```

## Purpose

Unlock VIP-only steps through validated checkout callback or gift-code redemption while preserving payment integrity.

## Responsibilities

- Create `MarathonPaymentAttempt` before checkout.
- Send checkout requests with server-side price/product values.
- Validate callback API key and match order, participant, product, amount, and currency.
- Redeem gift codes once and mark participant as VIP.

## Interfaces

- `POST /api/v1/vip/checkout`.
- `POST /api/v1/vip/gift-redemptions`.
- `POST /api/v1/payments/webhook`.
- Profile VIP panel and gift page.

## Dependencies

- payments-microservice.
- `PAYMENT_WEBHOOK_API_KEY`.
- Product and gift catalog rows.

## Data Ownership

Operations owns payment callback secret. Product Owner owns prices and gift codes. Marathon owns payment-attempt ledger and participant VIP state.

## Failure Modes

- Missing product blocks checkout.
- Missing or mismatched payment attempt blocks VIP unlock.
- Used/invalid gift code blocks gift unlock.
- Missing auth redirects through portal login preserving profile return path.

## Validation Criteria

- Payment callbacks cannot unlock VIP without matching ledger row.
- Gift redemption marks gift used and participant VIP state consistently.
- Journey verifier requires explicit mutating inputs for live payment/gift checks.
