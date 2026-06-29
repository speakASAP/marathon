# PROMPT-TASK-MAR-072: Restore Legacy Completed-Step Progression

## Coding Prompt

Read the legacy Marathon code before changing the new service. Preserve the old distinction between completion and checking:

- Completed report unlocks/opening eligibility.
- Checked report is a review/publication state.
- Existing opened answers remain available.
- A never-opened next step needs all previous reports completed before first access.
- Payment gates still override access.

In the new service, treat an existing `StepSubmission` as the legacy `Answer` opening ledger. Do not make `isChecked` a prerequisite for profile schedule visibility, saved submission lookup, or report submission.

## Expected Code Changes

- `MeService.buildSchedule()` keeps existing submissions open unless payment blocks them; missing future steps depend on previous completed submissions.
- `SubmissionsService` allows existing submissions and first step access, but requires completed previous submissions before creating/accessing a never-opened later step.
- Frontend completion helpers count `completed`, `checked`, and `done` as finished states.
- Production smoke validates that next-step lookup is allowed after completion and before review check.

## Rejected Approach

Do not enforce "all previous submissions checked" as a schedule or submission gate. That was the regression.
