# VAL-TASK-MAR-024: Landing Asset Serving Smoke Validation

```yaml
id: VAL-TASK-MAR-024
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-024-landing-asset-serving-smoke.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Smoke syntax is valid | Pass | Local and remote `node --check scripts/check-marathon-journey.js` completed without output. |
| Landing images are served by production | Pass | Production probes returned `200 image/png` for `talk.png`, `grammar.png`, `materials.png`, `result.png`, `start.png`, `finish.png`, and `mail.png`. |
| Journey smoke enforces served assets | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] landing-assets-served` before `[FAIL] catalog-readiness`. |
| Closed-catalog behavior is preserved | Pass | Read-only smoke still stops at `catalog-readiness` because approved active Marathon/Product/Gift/Step rows are absent. No mutating checks ran. |

## Sensitive-Data Scan

Validation recorded only public asset filenames, HTTP status/content type, smoke check names, and aggregate catalog-readiness status. It did not include JWTs, payment keys, participant records, gift-code values, or assignment report payloads.
