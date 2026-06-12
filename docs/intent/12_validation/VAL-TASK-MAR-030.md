# VAL-TASK-MAR-030: Home Missing Launch Gates Validation

```yaml
id: VAL-TASK-MAR-030
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-030-home-missing-gates.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pass | Remote `npm run build:frontend` completed with Vite output for `public/assets/index-Dl6-eaVq.css` and `public/assets/index-CZjZNSsj.js`. |
| Backend build or verifier syntax passes | Pass | Remote `node --check scripts/check-marathon-journey.js` and `npm run build` both completed successfully. |
| Deployment completes | Pass | Clean worktree deploy built and rolled out `localhost:5000/marathon:b9c6c60` in namespace `statex-apps`; production `/health` returned HTTP 200. |
| Smoke coverage added | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] home-missing-gates-ui` before expected `[FAIL] catalog-readiness`. |
| Closed home page shows launch blockers | Pass | In-app Browser validation on `/` showed `Регистрация скоро откроется`, `Недостающие условия запуска`, and readiness chips `Active Marathon`, `Steps`, `Gated Step`, `Step Content`, `Product`, and `Gift`. |
| Interaction remains usable | Pass | In-app Browser clicked the home closed-catalog `Поддержка` link and navigated to `/support` with page title `Поддержка — Marathon`. |
| Rendered route remains healthy | Pass | Browser validation found no framework overlay. Console API returned stale prior `/en/` parse errors from older asset hashes only, not current `/` errors. |
| Sensitive data excluded | Pass | Evidence records only public readiness class labels, build output asset names, pod/image identifiers, route titles, and smoke check names. |

## Sensitive-Data Scan

Validation records no JWTs, payment keys, participant records, gift-code values, private review text, or assignment report payloads.
