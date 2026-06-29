# ADR-009: Marathon Step Schedule And Deadline Rules

## Status

Accepted

## Context

The Marathon product exists to keep participants practicing every day. Step availability, report deadlines, penalty-circle handling, and bonus-day loss must therefore be consistent on every marathon, every language, and every step page.

Legacy reference points:

- `speakasap-portal/marathon/templates/marathon/common_rules.html` states that a new assignment appears after the current report is published at the time configured in profile settings, and that participants may open following stages manually to finish faster.
- `speakasap-portal/marathon/templates/marathon/faq.html` states that the report time is the deadline for the current stage and that the report must be published before that configured time.
- `speakasap-portal/marathon/templates/marathon/report.html` showed the next assignment opening time from the completed answer's `stop` value and offered an early-open link when a next answer existed.
- Legacy data fields preserved into the new service are `report_hour`, `days`/`bonusDaysLeft`, and `can_use_penalty`/`canUsePenalty`.

Legacy code evidence from `speakasap-portal` pre-removal history:

- `speakasap-portal@2b532b87a3:marathon/models.py` `Marathon.register()` created the first `Answer` immediately after registration.
- `Step.create_answer()` created a later `Answer` only when the previous step was finished, then set the new answer start to the previous answer stop and the stop to one day later.
- `Step.is_available()` checked wrong marathon, unfinished previous step, payment/trial gates, missing answer, future start time, and blocked participants. It did not require `Answer.checked`.
- `Answer.state` used `checked` only as a stronger visual/publication state after availability was already true: unavailable -> `inactive`, checked -> `checked`, completed -> `completed`, otherwise `active`.
- `Answer.check_answer()` marked a completed answer checked and created the next answer; missed incomplete answers entered penalty/bonus handling instead of unlocking progress.
- `OpenEarlyAnswerView` did not bypass the previous-step rule. It only changed the start time of an already-created next `Answer` to now.

Current-service compatibility rule:

- A `StepSubmission` row is the new service's equivalent of a legacy `Answer` row for access purposes.
- An existing `StepSubmission` means that step has already been opened and must remain navigable unless payment blocks the participant.
- Opening or submitting a step for the first time requires all previous steps to have completed submissions.
- `isChecked` is not an unlock prerequisite. It remains a review/publication/winner-quality signal and must not close completed historical steps or the participant's current opened step.
- A missing future step is openable early only after previous steps are completed; otherwise it is `previous_report_pending`.

## Decision

The canonical schedule contract is:

1. A participant works on one open marathon day at a time.
2. The first report submission anchors the participant's marathon clock. Subsequent scheduled opens use the configured report time for each following calendar slot.
3. Completing a report freezes that step's answers and marks that step completed.
4. After a completed report, the next unopened step may be opened manually, or it opens automatically at its scheduled time.
5. If a participant completes a step early, the automatic opening still waits until the configured scheduled slot. For example, if the slot is 24 hours and the report is completed after 4 hours, the automatic opening happens about 20 hours later.
6. A completed old step page must not show a stale immediate-next step if that next step is already completed. The next-control panel must describe the next unopened step in the participant's current marathon flow.
7. If an active, incomplete step already exists, the next-control panel targets the next unopened step after that active step. It must not offer "open now" until all previous steps are completed.
8. Missing a deadline is reconciled against the current step's due time. The first missed or late penalized step consumes the penalty-circle opportunity and creates an incomplete penalty report without removing prize eligibility.
9. After the penalty circle has been used, later missed or late penalized steps consume bonus days.
10. Marathon completion must happen before the maximum allowed route: all marathon days plus one penalty circle plus seven bonus days. After that route is exhausted, the participant is blocked from meaningful further progress while retaining access to completed steps.

Anti-regression rule: never gate schedule visibility, step page loading, draft loading, or report submission on all previous submissions being `isChecked=true`. That rule contradicts legacy `Step.is_available()` and makes completed-but-unchecked previous steps look closed.

## Consequences

- UI components must distinguish sequential page navigation from the next unopened marathon step.
- The schedule panel on any step page must be derived from the participant-wide schedule, not from the currently viewed step index alone.
- Backend deadline reconciliation remains the source of truth for penalties and bonus days; UI text may explain the schedule but must not mutate deadline state by itself.
- Any future scheduler/worker implementation must use the same due-time contract and should record validation evidence under `docs/intent/12_validation/`.

## Intent Preservation Chain

- Vision: Marathon keeps participants in a daily language-learning rhythm.
- Goal Impact: Correct schedule messaging prevents stale dates and keeps participants focused on the actual next day they must complete.
- System: `SYS-001-marathon-platform`.
- Feature: Assignment submissions and participant schedule progression.
- Task: `TASK-MAR-071-step-schedule-next-unopened-control`.
- Execution Plan: Apply shared frontend schedule targeting and validate against live participant schedule evidence.
- Coding Prompt: Show the next unopened step after the current active/incomplete step, not the immediate next step after the viewed page.
- Code: `frontend/src/pages/Step.tsx`, `frontend/src/pages/Profile.tsx`, `src/me/me.service.ts`, `src/submissions/submissions.service.ts`, `scripts/run-production-smoke-safe.js`.
- Validation: `VAL-TASK-MAR-071-step-schedule-next-unopened-control`, `VAL-TASK-MAR-072-restore-legacy-completed-step-progression`.
