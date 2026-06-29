# TASK-MAR-071: Step Schedule Next Unopened Control

## Objective

Fix the step page next-control panel so it displays the participant's next unopened marathon step instead of the immediate next step after the page currently being viewed.

## Scope

- Allowed files:
  - `frontend/src/pages/Step.tsx`
  - `docs/intent/07_decisions/ADR-009-marathon-step-schedule-rules.md`
  - `docs/intent/11_tasks/TASK-MAR-071-step-schedule-next-unopened-control.md`
  - `docs/intent/12_validation/VAL-TASK-MAR-071-step-schedule-next-unopened-control.md`
- Forbidden files:
  - Database migrations
  - Participant data mutation scripts
  - Legacy `speakasap-portal` runtime files

## Requirements

- Keep sequential previous/next page navigation unchanged.
- Derive the schedule panel from the participant-wide `answers` array.
- Treat `completed`, `checked`, and `done` as finished schedule states.
- If an active unfinished step exists, target the first unfinished step after that active step.
- If no active unfinished step exists, target the first unfinished step.
- Hide the panel when no unfinished step remains.
- Show the "open now" action only when all prior steps before the target are completed and the backend marks the target as openable.
- Preserve existing report-time form behavior.

## Parallel Execution

- Workstream A, ready now: frontend schedule-panel logic in `frontend/src/pages/Step.tsx`.
- Workstream B, ready now: documentation of canonical schedule rules in ADR/task/validation docs.
- Final integration: one owner validates the frontend build and live participant evidence before deployment.
- Shared contracts: `MyMarathon.answers`, `Answer.state`, `Answer.can_open`, `Answer.block_reason`.
- Validation owner: integration owner.
- Merge order: docs first or code first are both safe; deploy only after build succeeds.

## Validation Evidence

See `docs/intent/12_validation/VAL-TASK-MAR-071-step-schedule-next-unopened-control.md`.

## Intent Preservation Chain

- Vision: Marathon keeps participants practicing daily.
- Goal Impact: The next-control panel points to the real next day in the current participant flow.
- System: `SYS-001-marathon-platform`.
- Feature: Assignment submissions and participant schedule progression.
- Task: `TASK-MAR-071-step-schedule-next-unopened-control`.
- Execution Plan: Split sequential navigation from next-unopened schedule targeting.
- Coding Prompt: Do not show completed immediate-next steps as future steps.
- Code: `frontend/src/pages/Step.tsx`.
- Validation: `VAL-TASK-MAR-071-step-schedule-next-unopened-control`.
