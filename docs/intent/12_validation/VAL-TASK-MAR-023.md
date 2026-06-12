# VAL-TASK-MAR-023: Legacy Landing Asset Validation

```yaml
id: VAL-TASK-MAR-023
status: pending
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-023-resolve-legacy-landing-assets.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| CSS references existing assets | Pending | Confirm source and built CSS use existing `/img/landing/` files instead of missing `adv_*` and `support.png`. |
| Frontend build warnings are cleared | Pending | Confirm `npm run build:frontend` does not emit unresolved `adv_*` or `support.png` warnings. |
| Journey smoke covers built CSS | Pending | Confirm deployed `npm run check:journey` reports `landing-assets-resolved` before the expected catalog gate. |
| Deployment passes | Pending | Confirm rollout and readiness gate status. |

## Sensitive-Data Scan

Validation may record only asset names, command status, deployment image identity, and aggregate readiness status. Do not include catalog gift-code inventories, JWTs, payment keys, participant records, or assignment report payloads.
