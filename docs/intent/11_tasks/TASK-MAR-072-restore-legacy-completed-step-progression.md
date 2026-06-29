# TASK-MAR-072: Restore Legacy Completed-Step Progression

## Objective

Restore Marathon step opening so completed-but-unchecked previous reports do not close the participant's earlier opened stages, current stage, or next eligible stage.

## Problem

The checked-step gate introduced on 2026-06-29 made the German participant `fc2f9975-9151-49df-9297-4228d7d2891b` show stages 2, 3, and 4 as closed even though the participant had completed earlier reports and already opened current work. This contradicts the legacy Marathon flow.

## Legacy Rule To Preserve

- Legacy `Answer.checked` was not a prerequisite for `Step.is_available()`.
- Legacy `Step.is_available()` required the previous step to be finished before a new step became available.
- Legacy `Step.create_answer()` acted as the opening ledger: once an `Answer` existed and payment/time gates allowed it, the participant could navigate to it.
- Legacy early-open only adjusted an already-created next answer's `start` to now.

## Current-Service Contract

- Treat an existing `StepSubmission` as an opened legacy `Answer`.
- Keep existing submissions navigable unless payment blocks access.
- Require previous submissions to be completed before first opening/submitting a step with no existing submission.
- Do not require previous submissions to be checked.
- Keep `isChecked` for review/publication/winner quality, not schedule unlocking.

## Scope

Allowed files:

- `src/me/me.service.ts`
- `src/submissions/submissions.service.ts`
- `frontend/src/pages/Step.tsx`
- `frontend/src/pages/Profile.tsx`
- `scripts/run-production-smoke-safe.js`
- `docs/intent/07_decisions/ADR-009-marathon-step-schedule-rules.md`
- `docs/intent/11_tasks/TASK-MAR-072-restore-legacy-completed-step-progression.md`
- `docs/intent/12_validation/VAL-TASK-MAR-072-restore-legacy-completed-step-progression.md`
- `docs/intent/14_prompts/PROMPT-TASK-MAR-072-restore-legacy-completed-step-progression.md`
- `docs/intent/21_execution_plans/EP-TASK-MAR-072-restore-legacy-completed-step-progression.md`
- `docs/intent/22_goal_impact/GOAL-IMPACT-TASK-MAR-072.md`

Forbidden files:

- Database migrations
- Participant data mutation scripts
- Legacy `speakasap-portal` runtime files
- Payment callback semantics
- Winner medal policy unless separately approved

## Requirements

- German participant stages already represented by submissions must become navigable again.
- Completed states must remain completed even when unchecked.
- Checked states must count as completed in profile percentages and next-step targeting.
- Backend submit/draft lookup must block first access to a never-opened step if previous steps are not completed.
- Production smoke must assert the intended rule: after a completed report, the next submission lookup is allowed before review check.
- Documentation must record the legacy-code evidence and anti-regression rule.

## Parallel Execution

- Workstream A, ready now: legacy-code evidence and intent docs. Owner: documentation agent. Dependencies: read-only `speakasap-portal` history.
- Workstream B, ready now: backend schedule/submission gate. Owner: backend agent. Dependencies: current `MeService` and `SubmissionsService` contracts.
- Workstream C, ready now after backend contract is known: frontend status helper alignment. Owner: frontend agent. Dependencies: `Answer.state` semantics.
- Final integration: original thread applies one combined patch, validates, commits, deploys, and verifies live profile evidence.
- Shared contracts: `MyMarathon.answers`, `Answer.state`, `Answer.can_open`, `Answer.block_reason`, `StepSubmission.isCompleted`, `StepSubmission.isChecked`.
- Integration owner: original thread.
- Validation owner: original thread.
- Merge order: docs and code together, then build, read-only live evidence, deploy, post-deploy live profile verification.

## Intent Preservation Chain

- Vision: Marathon keeps participants moving through daily language practice without losing access to opened work.
- Goal Impact: Restoring legacy completed-step progression prevents completed German stages from appearing closed and protects all active marathons from the same regression.
- System: `SYS-001-marathon-platform`.
- Feature: Assignment submissions and participant schedule progression.
- Task: `TASK-MAR-072-restore-legacy-completed-step-progression`.
- Execution Plan: `EP-TASK-MAR-072-restore-legacy-completed-step-progression`.
- Coding Prompt: `PROMPT-TASK-MAR-072-restore-legacy-completed-step-progression`.
- Code: `src/me/me.service.ts`, `src/submissions/submissions.service.ts`, `frontend/src/pages/Step.tsx`, `frontend/src/pages/Profile.tsx`, `scripts/run-production-smoke-safe.js`.
- Validation: `VAL-TASK-MAR-072-restore-legacy-completed-step-progression`.
