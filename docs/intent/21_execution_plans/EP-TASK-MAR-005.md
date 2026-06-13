# EP-TASK-MAR-005: Post-Marathon NPS Survey

```yaml
id: EP-TASK-MAR-005
status: complete
source_task: docs/intent/11_tasks/TASK-MAR-005-post-marathon-nps-survey.md
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-13
completeness_level: complete
```

## Traceability

- Vision: participant journey and NPS success metric.
- Business case: `Participant NPS`.
- Feature: `FEAT-002`.
- ADR: `ADR-005`.

## Sensitive-Data Handling

NPS comments are private participant data. Store them for participant-owned product feedback, but do not expose comment text in analytics, support dashboard, smoke logs, or validation reports.

## Contract Impact

- New authenticated `POST /api/v1/me/marathons/:marathonerId/nps`.
- Profile detail response includes participant-owned survey status.
- Analytics response adds `surveys` aggregate metrics.

## Replay/Determinism

The submit endpoint is idempotent by participant: repeat submissions update the same response.

## Implementation Steps

1. Add `MarathonSurveyResponse` model and migration.
2. Extend `MeService` profile include/mapping and add `submitNps`.
3. Extend `MeController` with authenticated submit route.
4. Add survey UI to finished profile detail.
5. Add aggregate survey metrics to analytics and support dashboard.
6. Extend journey smoke with auth guard and frontend bundle checks.
7. Build backend/frontend, deploy, and verify live endpoints.

## Validation

- `npm run prisma:generate`
- `npm run build`
- `cd frontend && npm run build`
- deployed `/health`
- deployed `/api/v1/marathons/analytics`
- deployed `npm run check:journey`
- Browser check for profile/support surfaces when reachable without private credentials.

## Current Status

Complete. The final create/update path was verified on 2026-06-13 by the guarded production-safe smoke runner after TASK-MAR-061 isolated synthetic smoke data from analytics and public winners.
