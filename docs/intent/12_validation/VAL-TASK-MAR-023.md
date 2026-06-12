# VAL-TASK-MAR-023: Legacy Landing Asset Validation

```yaml
id: VAL-TASK-MAR-023
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-023-resolve-legacy-landing-assets.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| CSS references existing assets | Pass | Source CSS maps legacy advantage/contact images to existing assets: `talk.png`, `grammar.png`, `materials.png`, `result.png`, `start.png`, `finish.png`, and `mail.png`. Production root references `/assets/index-BhdsKuKn.css`, whose built CSS contains those assets instead of `adv_*` or `support.png`. |
| Frontend build warnings are cleared | Pass | Remote `npm run build:frontend` completed and `/tmp/marathon-build-frontend-assets.log` contained no unresolved `adv_*`, `support.png`, or `didn't resolve` warnings. |
| Journey smoke covers built CSS | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] landing-assets-resolved`, then stopped at expected `[FAIL] catalog-readiness` because approved catalog rows are still absent. |
| Browser runtime loads corrected CSS | Pass | In-app Browser DOM validation on `https://marathon.alfares.cz/?qa=landing-assets-790311b` showed the page loading `https://marathon.alfares.cz/assets/index-BhdsKuKn.css`, rendering closed-catalog copy, and no framework overlay. Returned console entries were stale prior `/en/` checks on old asset hashes, not current-page errors. |
| Deployment passes | Pass with expected readiness warning | Kubernetes rollout completed on image `localhost:5000/marathon:790311b`; production readiness still reports zero Marathon/Product/Gift/Step rows. |

## Sensitive-Data Scan

Validation recorded only asset names, command status, deployment image identity, browser stylesheet identity, and aggregate readiness status. It did not include catalog gift-code inventories, JWTs, payment keys, participant records, or assignment report payloads.
