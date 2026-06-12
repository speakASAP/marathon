# VAL-TASK-MAR-020: Pod-Safe Catalog Load Runbook Validation

```yaml
id: VAL-TASK-MAR-020
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-020-pod-catalog-load-runbook.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Helper syntax/help passes | Pass | Remote `sh -n scripts/load-catalog-in-pod.sh` passed and `sh scripts/load-catalog-in-pod.sh --help` printed usage plus environment overrides. |
| Helper dry-run stages, loads, and cleans up | Pass | Remote `npm run load:catalog:pod -- docs/examples/marathon-catalog.example.json` staged the placeholder catalog into pod `marathon-786d58664b-jrnkf`, ran the existing loader in dry-run mode, printed only redacted counts/checklist output, and `test ! -e /tmp/marathon-catalog.json` confirmed the staged pod copy was removed. |
| Backend build passes | Pass | Remote `npm run build` completed before deployment for commit `e6168ab`. |
| Frontend build passes | Pass | Remote `npm run build:frontend` completed and generated `public/assets/index-Cuaj5XTq.css`, `public/assets/index-DitTo2ZA.js`, and updated `public/index.html`. |
| Journey smoke covers pod-safe runbook | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] catalog-pod-runbook-ui: Support runbook includes pod-safe catalog dry-run/apply commands.` The command still exits non-zero because `[FAIL] catalog-readiness` is expected until approved Marathon/Product/Gift/Step data is loaded. |
| Support runbook renders pod-safe commands | Pass | Browser QA on `https://marathon.alfares.cz/support?qa=catalog-pod-runbook-e6168ab` found exact dry-run/apply commands and the staged-copy removal note. Screenshot: `/private/tmp/marathon-catalog-pod-runbook-e6168ab.png`. |
| Deployment passes | Pass with expected readiness warning | Kubernetes rollout completed on image `localhost:5000/marathon:e6168ab`; production readiness remains false because approved catalog source data is still absent. |

## Sensitive-Data Scan

Validation must reference only helper behavior, public support runbook copy, command status, and aggregate readiness status. Do not include catalog gift-code inventories, JWTs, payment keys, participant records, or assignment report payloads.

Final validation evidence references only helper behavior, redacted loader checklist counts, public support runbook copy, deployment image identity, and aggregate catalog-readiness status. No catalog gift-code inventories, JWTs, payment keys, participant records, or assignment report payloads were recorded.
