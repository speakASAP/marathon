# VAL-TASK-MAR-022: Catalog Approval Packet Validation

```yaml
id: VAL-TASK-MAR-022
status: pending
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-022-catalog-approval-packet.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Loader syntax passes | Pending | Confirm `node --check scripts/load-marathon-catalog.js`. |
| Helper syntax passes | Pending | Confirm `sh -n scripts/load-catalog-in-pod.sh`. |
| Approval packet is redacted | Pending | Confirm placeholder catalog output includes readiness/product/counts and excludes gift-code values, assignment text payloads, JWTs, payment keys, and participant records. |
| Apply conflict is rejected | Pending | Confirm `--approval-packet --apply` fails before any write. |
| Pod helper accepts packet mode | Pending | Confirm `npm run load:catalog:pod -- docs/examples/marathon-catalog.example.json --approval-packet` prints the packet and removes the staged pod file. |
| Support runbook and smoke cover packet command | Pending | Confirm build/deployed smoke reports `catalog-approval-packet-ui`. |
| Deployment passes | Pending | Confirm Kubernetes rollout and expected catalog readiness gate. |

## Sensitive-Data Scan

Validation may record only redacted approval-packet structure, command status, deployment image identity, frontend bundle identity, public runbook text, and aggregate readiness status. Do not include catalog gift-code inventories, JWTs, payment keys, participant records, or assignment report payloads.
