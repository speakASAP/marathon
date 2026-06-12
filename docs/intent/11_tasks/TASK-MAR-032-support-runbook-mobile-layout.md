# TASK-MAR-032: Support Runbook Mobile Layout and Ready-State Visibility

```yaml
id: TASK-MAR-032
status: pending-validation
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the `/support` launch and post-load verification runbooks readable on narrow mobile screens, and keep the post-load verification checklist visible after catalog readiness turns green. Operators must not lose the registration, VIP, gift, and assignment smoke sequence at the exact moment it becomes actionable.

## Scope

- Replace default ordered-list command indentation with stable counter columns.
- Apply the same mobile-safe command styling to catalog-load and post-load journey commands.
- Render post-load journey verification outside the closed-catalog launch gate.
- Add journey smoke coverage for the mobile-safe command layout markers in the built frontend bundle.
- Preserve existing support dashboard, catalog readiness, and post-load verification copy.

## Non-Goals

- Do not change registration, payment, gift, or assignment API behavior.
- Do not load catalog data or run mutating journey checks.
- Do not expose JWTs, gift-code values, participant records, payment secrets, or assignment report payloads.
- Do not edit course step content.

## Acceptance Criteria

- [ ] `/support` command lists render with mobile-safe counter columns.
- [ ] Catalog-load and post-load journey command blocks share the command styling.
- [ ] Post-load journey verification remains visible independently of the closed-catalog missing-gates runbook.
- [ ] Frontend production build succeeds.
- [ ] Backend build or verifier syntax checks pass for touched verifier code.
- [ ] Journey smoke reports `support-runbook-mobile-layout` before the expected catalog-readiness gate.
- [ ] Browser validation confirms the deployed mobile support runbook is readable without framework overlays.
- [ ] Deployment and validation evidence are recorded without sensitive data.
