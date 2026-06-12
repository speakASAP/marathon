# VAL-TASK-MAR-030: Home Missing Launch Gates Validation

```yaml
id: VAL-TASK-MAR-030
status: pending
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-030-home-missing-gates.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pending | Run remote `npm run build:frontend`. |
| Backend build or verifier syntax passes | Pending | Run remote `npm run build` and `node --check scripts/check-marathon-journey.js`. |
| Smoke coverage added | Pending | Run deployed pod `npm run check:journey` and confirm `[PASS] home-missing-gates-ui` appears before expected `[FAIL] catalog-readiness`. |
| Closed home page shows launch blockers | Pending | Validate `/` renders `Недостающие условия запуска` with readiness class chips while registration remains closed. |
| Sensitive data excluded | Pending | Confirm validation records only public readiness labels, build output, pod/image identifiers, and smoke names. |

## Sensitive-Data Scan

Pending validation. Expected evidence must not include JWTs, payment keys, participant records, gift-code values, private review text, or assignment report payloads.
