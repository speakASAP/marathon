# VAL-TASK-MAR-052: Public Detail Load-Error State Validation

```yaml
id: VAL-TASK-MAR-052
task: docs/intent/11_tasks/TASK-MAR-052-public-detail-error-states.md
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
- Browser-check winners and support-step public states after deployment.

## Evidence

- `npm run build:frontend` passed after adding public load-error states to `Winners.tsx`, `WinnerDetail.tsx`, and `SupportStep.tsx`.
- Built frontend emitted `public/assets/index-CCq2Cbju.js` and preserved `public/assets/index-CqV-Tb1C.css`.
- `scripts/check-marathon-journey.js` now asserts the built bundle contains `Winner results are temporarily unavailable`, `Winner profile is temporarily unavailable`, and `Support step is temporarily unavailable`.
- Clean detached worktree deployment completed for commit `c78179f`; Kubernetes served image `localhost:5000/marathon:c78179f`.
- Post-deploy `npm run check:journey` passed the new `public-detail-error-states` assertion plus existing winners/support assertions before the expected `catalog-readiness` gate.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/winners?qa=c78179f'` returned HTTP 200.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/winners/smoke-winner?qa=c78179f'` returned HTTP 200.
- Browser QA on `/winners?qa=c78179f-browser` loaded `index-CCq2Cbju.js`, rendered the no-finalists empty state, had no framework overlay, and produced no route-relevant console warnings/errors.
- Browser QA on `/winners/smoke-winner?qa=c78179f-browser` loaded `index-CCq2Cbju.js`, rendered the winner not-found state, had no framework overlay, and produced no route-relevant console warnings/errors.
- Browser QA on `/support/step/smoke-step?qa=c78179f-browser` loaded `index-CCq2Cbju.js`, rendered the support-step not-found state, had no framework overlay, and produced no route-relevant console warnings/errors.

## Result

Passed for TASK-MAR-052. Public winners and support-step routes now include explicit temporary load-error states and remain verified on production for healthy empty/not-found states.

Live populated winners and support-step proof remains blocked until approved catalog data, completed participants, and real assignment content are available.
