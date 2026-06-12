# VAL-TASK-MAR-005: NPS Survey Validation

```yaml
id: VAL-TASK-MAR-005
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-005-post-marathon-nps-survey.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Prisma generation passes | Pass | 2026-06-12 `npm run prisma:generate` generated Prisma Client v5.22.0 after adding `MarathonSurveyResponse`. |
| Backend build passes | Pass | 2026-06-12 `npm run build` completed TypeScript compilation. |
| Frontend build passes | Pass | 2026-06-12 `cd frontend && npm run build` completed; known non-fatal `/img/landing/adv_*` and `/img/landing/support.png` runtime asset warnings remain. |
| Unauthenticated survey submit is guarded | Pending | [MISSING: run deployed journey smoke after deploy.] |
| Analytics exposes aggregate NPS metrics | Pending | [MISSING: live analytics evidence after deploy.] |
| Support dashboard renders NPS aggregate | Pending | [MISSING: browser/build evidence after deploy.] |
| Final catalog journey verified | Blocked | Still depends on approved catalog data and live test inputs. |

## Sensitive-Data Scan

Current validation artifacts contain no NPS comments, JWTs, or participant private data. Remaining live verification must keep that constraint.
