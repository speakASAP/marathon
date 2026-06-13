# FEAT-001: Launch-Ready Catalog, VIP, and Assignment Flow

```yaml
id: FEAT-001
status: verified
owner: Product Owner
created: 2026-06-12
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/05_subsystems/SUB-001-registration-catalog.md
  - docs/intent/05_subsystems/SUB-002-vip-payments.md
  - docs/intent/05_subsystems/SUB-003-assignment-submissions.md
downstream:
  - docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
  - docs/intent/07_decisions/ADR-003-payment-attempt-ledger.md
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
```

## User or System Need

Participants need to register, continue assignments, and unlock VIP content only when the Marathon catalog is complete and operationally safe.

## Goal Impact

Supports VG-001, VG-002, VG-003, VG-004, and VG-005.

## Scope

- Load approved catalog data only.
- Keep registration closed until launch-ready data exists.
- Verify profile, VIP checkout, gift redemption, assignment submission, and saved report readback.
- Capture validation evidence before deployment/closure.

## Non-Goals

- Bulk import participant progress.
- Generate course content.
- Modify payment provider behavior.
- Automate winner creation.

## Acceptance Criteria

- [x] Approved catalog data exists for active production languages.
- [x] Readiness preflight passes against Kubernetes/shared PostgreSQL.
- [x] Read-only journey smoke passes.
- [x] Mutating registration/profile/VIP/gift/submission checks are run only with approved explicit inputs.
- [x] Validation report records evidence, gaps, and recommendation.

## Dependencies

- Product-approved catalog JSON.
- Payment callback runtime configuration.
- Auth portal login return behavior.
- Kubernetes runtime pod access for readiness command.

## Validation Strategy

Run the commands documented in `21_execution_plans/EP-TASK-MAR-004.md` and record results in `12_validation/VAL-TASK-MAR-004.md`.

## Verification Note

As of 2026-06-13, the launch-ready catalog, VIP, gift, assignment, winner, and NPS baseline is verified on the Kubernetes production runtime. New frontend changes should not reopen this feature unless they alter the registration, payment, gift, assignment, or readiness contracts.
