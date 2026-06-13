# VAL-TASK-MAR-051: Winners and Support-Step API Helper Validation

```yaml
id: VAL-TASK-MAR-051
task: docs/intent/11_tasks/TASK-MAR-051-winners-support-api-helper.md
status: production_verified
created: 2026-06-13
last_updated: 2026-06-13
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run read-only journey smoke before deployment.
- Deploy from a clean detached worktree after commit.
- Confirm Kubernetes serves the deployed image tag.
- Browser-check winners and support-step public guard/empty states after deployment.

## Evidence

- `npm run build:frontend` passed after extending `frontend/src/api/publicMarathon.ts` and refactoring `Winners.tsx`, `WinnerDetail.tsx`, and `SupportStep.tsx`.
- Built frontend emitted `public/assets/index-DY75JMDI.js` and preserved `public/assets/index-CqV-Tb1C.css`.
- Pre-deploy and post-deploy `npm run check:journey` passed catalog-independent winners and support assertions, including `winners-list`, `winners-empty-state-ui`, `support-public-participant-ui`, and `support-operator-markers-hidden`, before the expected `catalog-readiness` gate.
- Clean detached worktree deployment completed for commit `500430e`; Kubernetes served image `localhost:5000/marathon:500430e`.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/winners?qa=500430e'` returned HTTP 200.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/support/step/smoke-step?qa=500430e'` returned HTTP 200.
- Browser QA on `/winners?qa=500430e-browser` loaded `index-DY75JMDI.js`, rendered the no-finalists empty state, had no framework overlay, and produced no route-relevant console warnings/errors.
- Browser QA on `/support/step/smoke-step?qa=500430e-browser` loaded `index-DY75JMDI.js`, rendered the support-step not-found state, had no framework overlay, and produced no route-relevant console warnings/errors.

## Result

Passed for TASK-MAR-051. Winners and support-step public pages now use typed API helper access and are verified on production for catalog-independent empty/not-found states.

Live populated winners and support-step proof remains blocked until approved catalog data, completed participants, and real assignment content are available.
