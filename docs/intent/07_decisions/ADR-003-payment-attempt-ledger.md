# ADR-003: Require Payment-Attempt Ledger Match Before VIP Unlock

```yaml
id: ADR-003
status: accepted
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/05_subsystems/SUB-002-vip-payments.md
downstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Context

Payment callbacks must not be able to unlock VIP from only a participant ID or unverified payload.

## Decision

Marathon creates a `MarathonPaymentAttempt` before checkout. Payment callbacks must validate callback key and match order, participant, product, amount, and currency before VIP state is changed.

## Consequences

- Checkout creation and callback settlement are auditable.
- Callback smoke tests require explicit payment inputs.
- Schema/contract changes around payment attempts require execution-plan contract validation.

## Validation

Readiness checks must confirm payment runtime configuration and payment-attempt ledger availability. Live verification must confirm VIP state only after valid settlement or gift redemption.
