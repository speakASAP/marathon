# TASK-MAR-018: Harden VIP Checkout Redirect Validation

```yaml
id: TASK-MAR-018
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the VIP checkout path prove and enforce that a usable payment redirect exists before a participant leaves the Marathon profile.

## Scope

- Validate checkout redirect targets in the profile frontend before assigning `window.location.href`.
- Keep payment return states visible for success, confirmed VIP, and cancelled checkout flows.
- Make guarded mutating journey smoke fail if checkout does not return a valid redirect URL.
- Add read-only bundle coverage for checkout redirect validation and payment return-state copy.

## Non-Goals

- Do not create payment attempts without explicit `--mutating` smoke inputs.
- Do not change payment provider callback validation.
- Do not expose payment secrets or full provider payloads.
- Do not load catalog data.

## Acceptance Criteria

- [ ] Profile checkout rejects missing or malformed redirect URLs with a visible error.
- [ ] Payment return states remain visible for pending success, confirmed VIP, and cancelled checkout.
- [ ] Mutating journey checkout smoke requires a valid redirect URL when checkout is requested.
- [ ] Read-only journey smoke reports checkout redirect/return-state UI coverage.
- [ ] Build, deploy, Browser QA, and validation evidence are recorded.
