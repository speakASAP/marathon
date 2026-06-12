# VAL-TASK-MAR-005: NPS Survey Validation

```yaml
id: VAL-TASK-MAR-005
status: verified
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
| Unauthenticated survey submit is guarded | Pass | 2026-06-12 live `POST /api/v1/me/marathons/smoke-participant/nps` without auth returned 401; journey smoke also passed `nps-survey-auth-guard`. |
| Analytics exposes aggregate NPS metrics | Pass | 2026-06-12 live `GET /api/v1/marathons/analytics` returned `surveys.responses`, `promoters`, `passives`, `detractors`, `averageScore`, and `npsScore`; all zero because production has no participants yet. |
| Support dashboard renders NPS aggregate | Pass | 2026-06-12 Browser QA on `/support?qa=nps-2598bfc` showed `NPS responses`, `NPS score`, and `Avg. survey score`; no current `/support` console errors. |
| Final catalog journey verified | Blocked | Still depends on approved catalog data and live test inputs. |

## Sensitive-Data Scan

Pass. Current validation artifacts contain no NPS comments, JWTs, or participant private data; live evidence uses aggregate zeros, endpoint status, commit hash, and route names only.

## Deployment Evidence

- Commit: `2598bfc`.
- Image: `localhost:5000/marathon:2598bfc`.
- `/health`: `{"status":"ok"}`.
- Survey table check from the deployed pod: `{"surveyResponses":0}`.
- Journey smoke: all read-only/auth/bundle checks passed through `nps-survey-ui`, then expected `catalog-readiness` failure.
- Screenshot evidence: `/private/tmp/marathon-nps-support-2598bfc.png`.

## Closure Note

The implementation evidence is verified, but the upstream task remains `blocked` with `completeness_level: partial` until a real finished production participant can safely exercise NPS create/update. Do not treat aggregate analytics and auth-guard evidence as proof of the finished-participant mutation path.
