# TASK-MAR-031: Post-Load Journey Verification Runbook

```yaml
id: TASK-MAR-031
status: pending-validation
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make `/support` show the required post-catalog-load journey verification sequence, so catalog readiness is not mistaken for full production readiness before registration, VIP checkout, gift redemption, saved-assignment readback, and assignment submission smoke checks have been run.

## Scope

- Add a post-load journey verification block to the support launch runbook.
- Include read-only smoke, registration smoke, authenticated checkout smoke, gift redemption smoke, saved assignment readback, and assignment submission smoke commands.
- Use placeholders only for JWTs, gift codes, participant IDs, and step IDs.
- Add journey smoke coverage that requires the support checklist in the built frontend bundle.

## Non-Goals

- Do not load or mutate catalog data.
- Do not run mutating journey checks without approved smoke inputs.
- Do not expose JWTs, participant records, gift-code values, payment secrets, or assignment reports.
- Do not change payment, registration, gift, or assignment API behavior.

## Acceptance Criteria

- [ ] `/support` renders post-load journey verification commands.
- [ ] Verification copy covers registration, VIP checkout, gift redemption, saved assignment readback, and assignment submission.
- [ ] Frontend production build succeeds.
- [ ] Backend build or syntax checks pass for touched verifier code.
- [ ] Journey smoke reports `post-load-verification-ui` before the expected catalog-readiness gate.
- [ ] Deployment and validation evidence are recorded without sensitive data.
