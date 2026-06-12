# VAL-TASK-MAR-006: RunLayer Integration Validation

```yaml
id: VAL-TASK-MAR-006
status: verified
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
| Marathon deployment contains bridge | Pass | 2026-06-12 Kubernetes deployment image is `localhost:5000/marathon:e3fde20`; `/health` returned `{"status":"ok"}`. |
| RunLayer deployment contains route | Pass | 2026-06-12 Kubernetes deployment image is `localhost:5000/runlayer:1ae690b`; deploy smoke test passed. |
| Marathon task endpoint works live | Pass | 2026-06-12 `POST https://marathon.alfares.cz/api/v1/tasks/execute` with `marathon:readiness_report` returned `output_ref.readiness.ready=false` and missing catalog keys only. |
| RunLayer can call Marathon service URL | Pass | 2026-06-12 `kubectl exec deploy/runlayer -- node -e ...fetch("http://marathon:3000/api/v1/tasks/execute")` returned aggregate `marathon:analytics_summary` output. |
| RunLayer project registration exists | Pass | 2026-06-12 RunLayer project row `slug=marathon`, `repo_ref=marathon`, `status=active`, `stage=mvp`, `execution_mode=manual`, `catalog_ready=false` was inserted or updated idempotently. |
| Marathon journey smoke covers RunLayer tasks | Pass | 2026-06-12 deployed `npm run check:journey` passed `runlayer-readiness-task` and `runlayer-engagement-task`, then stopped at the expected `catalog-readiness` blocker. |
| Final catalog journey verified | Blocked | Still depends on approved catalog data and live test inputs. |

## Sensitive-Data Scan

Pre-deploy artifacts contain no participant-private data or secrets. Live validation recorded only aggregate/status evidence: deployment images, health, readiness booleans, catalog counts, aggregate analytics, and the public RunLayer project slug/id metadata. The RunLayer task outputs intentionally omit participant reports, emails, JWTs, payment secrets, full gift codes, and survey comments.

## Live Result

RunLayer can now route `marathon:*` tasks to Marathon's read-only task bridge in production. Marathon remains closed for public launch because no approved active Marathon/Product/Gift/Step catalog exists in production yet.
