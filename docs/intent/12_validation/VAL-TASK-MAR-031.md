# VAL-TASK-MAR-031: Post-Load Journey Verification Runbook Validation

```yaml
id: VAL-TASK-MAR-031
status: pending
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-031-post-load-verification-runbook.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pending | Run remote `npm run build:frontend`. |
| Backend build or verifier syntax passes | Pending | Run remote `npm run build` and `node --check scripts/check-marathon-journey.js`. |
| Smoke coverage added | Pending | Run deployed pod `npm run check:journey` and confirm `[PASS] post-load-verification-ui` appears before expected `[FAIL] catalog-readiness`. |
| Support page shows post-load verification | Pending | Validate `/support` renders `Post-load journey verification` and placeholder-only journey commands. |
| Sensitive data excluded | Pending | Confirm validation records only public runbook copy, build output, pod/image identifiers, route titles, and smoke names. |

## Sensitive-Data Scan

Pending validation. Expected evidence must not include JWTs, payment keys, participant records, gift-code values, private review text, or assignment report payloads.
