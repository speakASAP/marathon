# VAL-TASK-MAR-006: RunLayer Integration Validation

```yaml
id: VAL-TASK-MAR-006
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-006-runlayer-readonly-integration.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Marathon build passes | Pass | 2026-06-12 `npm run build` completed after adding `src/runlayer/*`. |
| RunLayer build passes | Pass | 2026-06-12 `npm run build` completed after adding `marathon` task-router prefix. |
| RunLayer router test passes | Pass | 2026-06-12 `npm test -- --runTestsByPath src/worker/task-router.service.spec.ts` passed. |
| Marathon task endpoint works live | Pending | [MISSING: deploy and curl.] |
| RunLayer can call Marathon service URL | Pending | [MISSING: pod-to-service call.] |
| RunLayer project registration exists | Pending | [MISSING: DB/API evidence.] |
| Marathon journey smoke covers RunLayer tasks | Pending | [MISSING: run deployed smoke.] |
| Final catalog journey verified | Blocked | Still depends on approved catalog data and live test inputs. |

## Sensitive-Data Scan

Pre-deploy artifacts contain no participant-private data or secrets. Live validation must continue to record aggregate/status evidence only.
