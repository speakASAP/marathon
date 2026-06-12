# VAL-TASK-MAR-014: Root Teaser Empty States Validation

```yaml
id: VAL-TASK-MAR-014
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-014-root-teaser-empty-states.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Backend build passes | Pass | 2026-06-12 remote `npm run build` completed. |
| Frontend build passes | Pass | 2026-06-12 remote `npm run build:frontend` completed and generated updated Vite assets. |
| Journey smoke covers empty states | Pass | 2026-06-12 deployed pod `npm run check:journey` reported `[PASS] home-teaser-empty-state: Home finalists and reviews teasers include post-load empty states.` |
| Root finalists empty state renders | Pass | 2026-06-12 Browser QA on `https://marathon.alfares.cz/?qa=root-empty-d52b2d1` found `Финалисты появятся после завершения первых марафонов.` and no `Загрузка…` inside the finalists/reviews teaser. Screenshot: `/private/tmp/marathon-root-empty-state-d52b2d1.png`. |
| Deployment passes | Pass | 2026-06-12 deployment rolled out image `localhost:5000/marathon:d52b2d1`; readiness warning remained the expected missing-catalog gate. |

## Sensitive-Data Scan

Validation referenced only public root landing state and aggregate/empty API responses. No JWTs, participant data, gift-code inventories, payment secrets, or assignment reports were recorded.
