# TASK-MAR-031: Post-Load Journey Verification Runbook

```yaml
id: TASK-MAR-031
status: verified
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

- [x] `/support` renders post-load journey verification commands.
- [x] Verification copy covers registration, VIP checkout, gift redemption, saved assignment readback, and assignment submission.
- [x] Frontend production build succeeds.
- [x] Backend build or syntax checks pass for touched verifier code.
- [x] Journey smoke reports `post-load-verification-ui` before the expected catalog-readiness gate.
- [x] Deployment and validation evidence are recorded without sensitive data.

## Validation

- Remote `node --check scripts/check-marathon-journey.js` passed.
- Remote `npm run build` passed.
- Remote `npm run build:frontend` passed and emitted `public/assets/index-DKvqxEA-.css` and `public/assets/index-DkLNhPJl.js`.
- Commit `7c64986` deployed from a clean detached worktree as image `localhost:5000/marathon:7c64986`.
- Production `/health` returned HTTP 200 after deployment.
- Deployed pod journey smoke reported `[PASS] post-load-verification-ui` before the expected `[FAIL] catalog-readiness` gate.
- Browser validation on `https://marathon.alfares.cz/support` rendered `Post-load journey verification`, the placeholder-only registration, checkout, gift, saved-readback, and assignment-submit commands, and no current-page framework overlay.
