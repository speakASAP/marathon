# VAL-TASK-MAR-048: Profile and Payment API Helper Validation

```yaml
id: VAL-TASK-MAR-048
task: docs/intent/11_tasks/TASK-MAR-048-profile-api-helper.md
status: production_verified
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run read-only journey smoke before deployment.
- Deploy from a clean detached worktree.
- Confirm Kubernetes serves the deployed image tag.
- Browser-check the direct profile route guard after deployment.

## Evidence

- `npm run build:frontend` passed after extracting `frontend/src/api/profileMarathon.ts`.
- Built frontend emitted `public/assets/index-ClVWmuZG.js` and preserved `public/assets/index-CqV-Tb1C.css`.
- Pre-deploy `npm run check:journey` passed catalog-independent profile/payment/report/NPS assertions, including `checkout-login-handoff`, `checkout-return-state-ui`, `profile-detail-error-state`, `progress-report-ui`, and `nps-survey-ui`, before the expected `catalog-readiness` gate.
- Clean detached worktree deployment completed for commit `6695c84`; Kubernetes served image `localhost:5000/marathon:6695c84`.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/profile/smoke-participant?payment=success&qa=6695c84'` returned HTTP 200.
- Browser QA on the direct profile return route handed off unauthenticated access to the portal login, rendered a nonblank page, showed no framework overlay, and produced no current console warnings/errors.
- Post-deploy `npm run check:journey` passed all catalog-independent frontend, registration, checkout, profile, progress report, NPS, support, landing, and gift-readiness assertions. It failed only at the expected `catalog-readiness` gate because no approved production catalog rows exist.

## Result

Passed for TASK-MAR-048. The typed profile/payment API helper is built, deployed, and verified on production for the guarded read-only journey.

Live checkout, progress report, and NPS mutation proof remains blocked until approved catalog data and authenticated test participant inputs are available.
