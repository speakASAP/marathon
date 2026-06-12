# VAL-TASK-MAR-017: Assignment Empty and Error State Validation

```yaml
id: VAL-TASK-MAR-017
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-017-step-peer-empty-state.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Backend build passes | Pass | Remote `npm run build` completed before deployment for commits `9e2e4cb` and `54d2f87`. |
| Frontend build passes | Pass | Remote `npm run build:frontend` completed and generated `public/assets/index-Cuaj5XTq.css`, `public/assets/index-CkQ1pAl3.js`, and updated `public/index.html`. |
| Journey smoke covers assignment empty/error states | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] assignment-status-error-submit-guard` and `[PASS] step-peer-empty-state`. The command still exits non-zero because `[FAIL] catalog-readiness` is expected until approved Marathon/Product/Gift/Step data is loaded. |
| Assignment peer-report empty state renders | Pass | Browser QA on the deployed production bundle at `https://marathon.alfares.cz/steps/smoke-step?...` mocked only assignment API responses, found `Пока нет примеров отчетов`, and found `Ваш собственный отчет можно отправить`. Screenshot: `/private/tmp/marathon-step-empty-guard-54d2f87.png`. |
| Assignment saved-status failure blocks submit | Pass | Browser QA mocked `GET /api/v1/me/marathons/smoke-participant/submissions/smoke-step` as HTTP 500, found `Submission is paused until this assignment status can be checked`, and confirmed `#step-report` was disabled. |
| Deployment passes | Pass with expected readiness warning | Kubernetes rollout completed on image `localhost:5000/marathon:54d2f87`; production readiness remains false because approved catalog source data is still absent. |

## Sensitive-Data Scan

Validation must reference only public assignment-page UI copy and aggregate/empty API behavior. Do not include JWTs, participant private reports, gift codes, payment secrets, or assignment report payloads.

Final validation evidence references only public assignment UI copy, mocked empty/error API responses, deployment image identity, and aggregate catalog-readiness status. No JWTs, participant private reports, gift codes, payment secrets, or assignment report payloads were recorded.
