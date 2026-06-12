# VAL-TASK-MAR-017: Assignment Empty and Error State Validation

```yaml
id: VAL-TASK-MAR-017
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-017-step-peer-empty-state.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Backend build passes | Pending | [MISSING: `npm run build` evidence.] |
| Frontend build passes | Pending | [MISSING: `npm run build:frontend` evidence.] |
| Journey smoke covers assignment empty/error states | Pending | [MISSING: `npm run check:journey` evidence.] |
| Assignment peer-report empty state renders | Pending | [MISSING: Browser QA evidence.] |
| Assignment saved-status failure blocks submit | Pending | [MISSING: source or browser QA evidence.] |
| Deployment passes | Pending | [MISSING: deployed image evidence.] |

## Sensitive-Data Scan

Validation must reference only public assignment-page UI copy and aggregate/empty API behavior. Do not include JWTs, participant private reports, gift codes, payment secrets, or assignment report payloads.
