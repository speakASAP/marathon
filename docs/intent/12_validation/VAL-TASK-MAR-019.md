# VAL-TASK-MAR-019: Authenticated Registration Binding Validation

```yaml
id: VAL-TASK-MAR-019
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-019-registration-auth-binding.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Backend build passes | Pass | Remote `npm run build` completed before deployment for commit `ff391f6`. |
| Frontend build passes | Pass | Remote `npm run build:frontend` completed and generated `public/assets/index-Cuaj5XTq.css`, `public/assets/index-D70XhmaN.js`, and updated `public/index.html`. |
| Journey smoke covers authenticated registration binding | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] registration-auth-binding-ui: Registration frontend sends Marathon token for immediate participant binding and handles expired sessions.` Mutating smoke now asserts `userBound=true` when an auth token is supplied; full mutating execution remains gated by catalog readiness and approved inputs. |
| Registration binding UI guard renders | Pass | Browser QA on the deployed production bundle mocked only catalog/registration endpoints, stored `marathon_token=smoke-token`, submitted the registration form, and captured `Authorization: Bearer smoke-token` on `POST /api/v1/registrations`. The 401 path redirected to portal login with `next` returning to `https://marathon.alfares.cz/en/`. Screenshot: `/private/tmp/marathon-registration-binding-ff391f6.png`. |
| Invalid bearer token behavior is guarded | Pass | Production API check `POST /api/v1/registrations` with `Authorization: Bearer invalid-smoke-token` returned HTTP 401 and `Invalid or expired registration token` before catalog registration logic. |
| Deployment passes | Pass with expected readiness warning | Kubernetes rollout completed on image `localhost:5000/marathon:ff391f6`; production readiness remains false because approved catalog source data is still absent. |

## Sensitive-Data Scan

Validation must reference only public registration UI copy, masked auth-binding status, and aggregate readiness status. Do not include JWTs, user secrets, full participant records, payment secrets, gift codes, or assignment report payloads.

Final validation evidence references only public registration UI copy, the masked token header shape, HTTP status/message for invalid bearer behavior, deployment image identity, and aggregate catalog-readiness status. No JWTs, user secrets, full participant records, payment secrets, gift codes, or assignment report payloads were recorded.
