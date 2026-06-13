# VAL-TASK-MAR-005: NPS Survey Validation

```yaml
id: VAL-TASK-MAR-005
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-13
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
| Final catalog journey verified | Pass | 2026-06-13 production-safe smoke completed readiness and read-only journey checks after creating a synthetic finished participant. |

## Sensitive-Data Scan

Pass. Current validation artifacts contain no NPS comments, JWTs, or participant private data; live evidence uses aggregate zeros, endpoint status, commit hash, and route names only.

## Deployment Evidence

- Commit: `2598bfc`.
- Image: `localhost:5000/marathon:2598bfc`.
- `/health`: `{"status":"ok"}`.
- Survey table check from the deployed pod: `{"surveyResponses":0}`.
- Journey smoke: all read-only/auth/bundle checks passed through `nps-survey-ui`, then expected `catalog-readiness` failure.
- Screenshot evidence: `/private/tmp/marathon-nps-support-2598bfc.png`.

## Production Finished-Participant Mutation Proof

Pass on 2026-06-13. `npm run smoke:production-safe` ran inside the Marathon pod using phone-only Marathon registration and a synthetic `Marathon Prod Smoke ...` participant. The runner completed 29 submissions, unlocked VIP by gift, created a winner row, submitted NPS score 10, submitted NPS score 9 for the same participant, and verified `rowsForParticipant=1`. Runner output masked user and participant IDs and did not print JWTs, gift codes, or private report payloads.

Post-smoke public checks remained clean: analytics returned `surveys.responses=0`, `surveys.npsScore=0`, `participants.total=53470`, and `winners.medalRows=3608`; public winners returned `total=3608`. Notification storage aggregate counts were `example_invalid=0`, `smoke_content=0`, and `recent_marathon=0`.

## Closure Note

Complete. The formerly blocked finished-participant create/update path is now verified with synthetic production evidence that is excluded from public analytics and winner surfaces.
