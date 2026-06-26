# SUB-003: Assignment Submissions

```yaml
id: SUB-003
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/04_systems/SYS-001-marathon-platform.md
downstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
```

## Purpose

Allow authenticated participants to read assignment content, submit reports, reload saved reports, and see progress/late/bonus-day state.

## Responsibilities

- Render assignment content as plain text.
- Require profile participant context and JWT before report submission.
- Create/update participant submissions.
- Track late penalty, missed-deadline, penalty-circle, and bonus-day behavior.
- Show active/completed/late/locked/VIP-gated schedule state.
- Preserve at least 24 hours before the next unfinished stage when a participant changes the report publication time.

## Interfaces

- `GET /api/v1/steps/:id`.
- `GET /api/v1/me/marathons/:marathonerId/submissions/:stepId`.
- `POST /api/v1/me/marathons/:marathonerId/submissions`.
- `/profile/:marathonerId`.
- `/steps/:stepId`.

## Dependencies

- Launch-ready catalog with approved `assignmentContent`.
- Auth-microservice JWT validation.
- Participant profile state.

## Data Ownership

Product Owner owns assignment content. Participant/system owns submitted reports and progress state.

## Schedule And Penalty Semantics

Legacy Django Marathon evidence ('speakasap-portal' before legacy model removal, commit parent '2c73a5289d^') used one 'Answer' per opened step. 'Answer.check_answer()' completed the current answer and created the next answer; if the current answer was still incomplete after its 'stop' time, the first miss called 'Marathoner.assign_penalty()' and created an unfinished 'PenaltyReport' ("штрафной круг") without subtracting a bonus day. Later misses called 'Marathoner.subtract_bonus()' while days remained. 'OpenEarlyAnswerView' opened an already-created next answer by setting its 'start' to now. The old 'marathon.check_activity' Celery periodic task warned and eventually blocked stale answers, but the penalty decision itself lived in answer checking rather than system crontab.

Modern Marathon stores the participant's report publication anchor in 'MarathonParticipant.reportHour'; stage 'N' starts at 'reportHour + (N - 1) days' and is due 24 hours later. When the participant profile is loaded, the service reconciles unfinished steps whose due time has passed exactly once per step:

- First missed or late report: create an unfinished 'PenaltyReport', set 'canUsePenalty=false', and keep 'bonusDaysLeft' unchanged.
- Later missed or late reports: create a completed penalty entry and decrement 'bonusDaysLeft', clamped at zero.
- Changing report time is scheduling-only: it never creates penalty reports and never decrements 'bonusDaysLeft'.
- When report time is changed, the next unfinished stage is shifted forward until its start is at least 24 hours from the save moment.

## Failure Modes

- Missing assignment content blocks launch readiness.
- Missing auth blocks submission and preserves exact return path.
- Step not found and backend failure must be distinct UI states.
- Penalty reconciliation must be idempotent per participant and step.
- Report-time changes must not shorten the next unfinished stage window below 24 hours.

## Validation Criteria

- Saved report readback works for authenticated participant and explicit IDs.
- Mutating submission smoke checks require `--mutating`.
- Step content is rendered without HTML injection.
- Loading a participant after a missed due time creates at most one penalty event for that step.
- Updating report time to a near-future clock value moves the next unfinished stage to a later day instead of giving less than 24 hours.
