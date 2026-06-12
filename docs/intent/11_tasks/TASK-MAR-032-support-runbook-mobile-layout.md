# TASK-MAR-032: Support Runbook Mobile Layout and Ready-State Visibility

```yaml
id: TASK-MAR-032
status: verified
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

- [x] `/support` command lists render with mobile-safe counter columns.
- [x] Catalog-load and post-load journey command blocks share the command styling.
- [x] Post-load journey verification remains visible independently of the closed-catalog missing-gates runbook.
- [x] Frontend production build succeeds.
- [x] Backend build or verifier syntax checks pass for touched verifier code.
- [x] Journey smoke reports `support-runbook-mobile-layout` before the expected catalog-readiness gate.
- [x] Browser validation confirms the deployed mobile support runbook is readable without framework overlays.
- [x] Deployment and validation evidence are recorded without sensitive data.

## Validation

- Remote `node --check scripts/check-marathon-journey.js` passed.
- Remote `npm run build` passed.
- Remote `npm run build:frontend` passed and emitted `public/assets/index-Bd61Vj36.css` and `public/assets/index-B7lv3y2m.js`.
- Commit `f24972f` deployed from a clean detached worktree as image `localhost:5000/marathon:f24972f`.
- Production `/health` returned HTTP 200 after deployment.
- Deployed pod journey smoke reported `[PASS] support-runbook-mobile-layout` before the expected `[FAIL] catalog-readiness` gate.
- Browser validation on `https://marathon.alfares.cz/support?qa=f24972f` at a 319px viewport confirmed `support-post-load-verification` is visible, is not nested inside `support-launch-runbook`, uses `support-runbook-command`, and has no current-page framework overlay.
