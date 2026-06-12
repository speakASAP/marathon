# VAL-TASK-MAR-028: Landing Missing Launch Gates Validation

```yaml
id: VAL-TASK-MAR-028
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-028-landing-missing-gates.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pass | Remote `npm run build:frontend` completed with Vite output for `public/assets/index-BWR5Nykz.css` and `public/assets/index-B7kDyT0b.js`. |
| Backend build or verifier syntax passes | Pass | Remote `node --check scripts/check-marathon-journey.js` and `npm run build` both completed successfully. |
| Deployment completes | Pass with manual rollout recovery | `./scripts/deploy.sh` built and pushed `localhost:5000/marathon:0e6e483`; rollout initially timed out while the new pod was stuck in image pull, then the non-ready pod was retried and `kubectl -n statex-apps rollout status deploy/marathon --timeout=180s` reported success. |
| Smoke coverage added | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] landing-missing-gates-ui` before expected `[FAIL] catalog-readiness`. |
| Closed landing shows launch blockers | Pass | In-app Browser validation on `/en/#register` showed `Registration is not open yet`, `Launch blockers`, and readiness chips `Active Marathon`, `Steps`, `Gated Step`, `Step Content`, `Product`, and `Gift`; the hero status CTA scrolled to the panel. |
| Rendered route remains healthy | Pass | Production `/health` and `/en/` returned HTTP 200, Browser page title was `English Marathon — 30 days of daily language practice`, and no framework overlay was present. Console API returned stale prior `/en/` parse errors from older asset hashes only, not current-page errors. |
| Sensitive data excluded | Pass | Evidence records only public readiness class labels, build output asset names, pod/image identifiers, and smoke check names. |

## Sensitive-Data Scan

Validation records no JWTs, payment keys, participant records, gift-code values, private review text, or assignment report payloads.
