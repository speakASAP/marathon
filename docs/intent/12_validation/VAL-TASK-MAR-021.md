# VAL-TASK-MAR-021: Catalog Source-Owner Approval Checklist Validation

```yaml
id: VAL-TASK-MAR-021
status: pending
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-021-catalog-source-owner-approval.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Checklist document exists | Pending | Confirm local and deployed checklist artifacts exist. |
| Public checklist is served | Pending | Confirm `/catalog/marathon-catalog.approval-checklist.md` returns Markdown text, not the SPA shell. |
| Support launch gate links checklist | Pending | Confirm `/support` includes the public approval checklist link. |
| Journey smoke covers checklist | Pending | Confirm deployed `npm run check:journey` reports `catalog-approval-checklist` and `catalog-approval-checklist-ui` before the expected catalog gate. |
| Deployment passes | Pending | Confirm Kubernetes rollout and health checks pass. |

## Sensitive-Data Scan

Validation may record only public checklist text presence, command status, deployment image identity, and aggregate readiness status. Do not include catalog gift-code inventories, JWTs, payment keys, participant records, or assignment report payloads.
