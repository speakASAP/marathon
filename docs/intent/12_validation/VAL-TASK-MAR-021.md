# VAL-TASK-MAR-021: Catalog Source-Owner Approval Checklist Validation

```yaml
id: VAL-TASK-MAR-021
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-021-catalog-source-owner-approval.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Checklist document exists | Pass | Remote source includes `docs/marathon-catalog-approval-checklist.md`, `frontend/public/catalog/marathon-catalog.approval-checklist.md`, and built `public/catalog/marathon-catalog.approval-checklist.md`. |
| Public checklist is served | Pass | Production `curl -i -H 'Cache-Control: no-cache' https://marathon.alfares.cz/catalog/marathon-catalog.approval-checklist.md` returned HTTP 200 with `content-type: text/markdown` and the source-owner approval checklist text, not the SPA shell. |
| Support launch gate links checklist | Pass | In-app Browser DOM validation on `https://marathon.alfares.cz/support?qa=catalog-approval-checklist-3d7f49f&fresh=2` loaded `assets/index-Cc8QClRS.js`, showed `Launch gate`, and exposed an `Approval Checklist` link with href `/catalog/marathon-catalog.approval-checklist.md`. Screenshot capture timed out in the Browser runtime; DOM, bundle, and HTTP evidence were captured instead. |
| Journey smoke covers checklist | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] catalog-approval-checklist` and `[PASS] catalog-approval-checklist-ui`, then stopped at the expected `[FAIL] catalog-readiness` because approved launch catalog rows are still absent. |
| Deployment passes | Pass with expected readiness warning | Kubernetes rollout completed on image `localhost:5000/marathon:3d7f49f`; production readiness still reports zero Marathon/Product/Gift/Step rows. |

## Sensitive-Data Scan

Validation recorded only public checklist text presence, command status, deployment image identity, frontend bundle identity, public link presence, and aggregate readiness status. It did not include catalog gift-code inventories, JWTs, payment keys, participant records, or assignment report payloads.
