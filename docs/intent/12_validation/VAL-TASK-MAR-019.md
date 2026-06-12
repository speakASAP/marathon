# VAL-TASK-MAR-019: Authenticated Registration Binding Validation

```yaml
id: VAL-TASK-MAR-019
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-019-registration-auth-binding.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Backend build passes | Pending | [MISSING: `npm run build` evidence.] |
| Frontend build passes | Pending | [MISSING: `npm run build:frontend` evidence.] |
| Journey smoke covers authenticated registration binding | Pending | [MISSING: `npm run check:journey` evidence.] |
| Registration binding UI guard renders | Pending | [MISSING: Browser or bundle QA evidence.] |
| Invalid bearer token behavior is guarded | Pending | [MISSING: API/source evidence.] |
| Deployment passes | Pending | [MISSING: deployed image evidence.] |

## Sensitive-Data Scan

Validation must reference only public registration UI copy, masked auth-binding status, and aggregate readiness status. Do not include JWTs, user secrets, full participant records, payment secrets, gift codes, or assignment report payloads.
