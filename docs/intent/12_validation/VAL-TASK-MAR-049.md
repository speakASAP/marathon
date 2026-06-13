# VAL-TASK-MAR-049: Profile Dashboard API Helper Validation

```yaml
id: VAL-TASK-MAR-049
task: docs/intent/11_tasks/TASK-MAR-049-profile-dashboard-api-helper.md
status: production_verified
created: 2026-06-12
last_updated: 2026-06-13
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run read-only journey smoke before deployment.
- Deploy from a clean detached worktree after commit.
- Confirm Kubernetes serves the deployed image tag.
- Browser-check the direct profile dashboard guard after deployment.

## Evidence

- `npm run build:frontend` passed after adding `fetchMyMarathons()` to `frontend/src/api/profileMarathon.ts` and refactoring `frontend/src/pages/Profile.tsx`.
- Built frontend emitted `public/assets/index-CDzgSJjT.js` and preserved `public/assets/index-CqV-Tb1C.css`.
- Pre-deploy and post-deploy `npm run check:journey` passed catalog-independent profile dashboard assertions, including `profile-error-state` and `profile-empty-readiness-state`, before the expected `catalog-readiness` gate.
- Clean detached worktree deployment completed for commit `749c65b`; Kubernetes served image `localhost:5000/marathon:749c65b`.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/profile?qa=749c65b-recheck'` returned HTTP 200.
- Browser QA on `https://marathon.alfares.cz/profile?qa=749c65b-fresh-b` loaded the current `index-CDzgSJjT.js` bundle, rendered the `Мои марафоны` guard with `Войти через SpeakASAP`, had no loading state, and showed no framework overlay.
- Browser console entries present during QA belonged to stale older `/en/` tabs and older asset hashes; no current `/profile` route error was observed.

## Result

Passed for TASK-MAR-049. The profile dashboard now uses the typed profile API helper for authenticated marathon-list loading and is verified on production for the unauthenticated guard and catalog-independent journey states.

Live populated-dashboard proof remains blocked until approved catalog data and authenticated participant inputs are available.
