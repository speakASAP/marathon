# EP-TASK-MAR-072: Restore Legacy Completed-Step Progression

## Execution Plan

1. Read legacy Marathon code from `speakasap-portal` history at a pre-removal commit.
2. Capture current checked-step regression in the new `marathon` service.
3. Document the legacy unlock contract and anti-regression rule.
4. Patch backend schedule construction and submission access guard.
5. Patch frontend completion helpers and status text.
6. Patch production smoke so it validates completed-before-checked progression.
7. Build and validate.
8. Deploy from `/home/ssf/Documents/Github/marathon`.
9. Verify the German participant profile after rollout.

## Detailed Code Plan

- In `src/me/me.service.ts`, existing submissions should be rendered from their own state and remain `can_open` unless payment blocks them.
- In `src/me/me.service.ts`, missing steps should be openable only if previous steps have completed submissions.
- In `src/submissions/submissions.service.ts`, replace the checked-step assertion with a completed-or-existing-opened-step assertion.
- In `frontend/src/pages/Step.tsx`, count `completed`, `checked`, and `done` as finished schedule states and remove "checking" from the previous-report pending copy.
- In `frontend/src/pages/Profile.tsx`, count `checked` as progress completion.
- In `scripts/run-production-smoke-safe.js`, validate next-step saved-submission lookup after a completed report and before marking that report checked.

## Parallel Execution

- Workstream A: documentation. Status: ready now. Allowed files: intent docs. Forbidden files: source and deploy files.
- Workstream B: backend. Status: ready now. Allowed files: `src/me/me.service.ts`, `src/submissions/submissions.service.ts`, smoke script. Forbidden files: migrations and DB mutation scripts.
- Workstream C: frontend. Status: ready now after backend state names are fixed. Allowed files: `frontend/src/pages/Step.tsx`, `frontend/src/pages/Profile.tsx`. Forbidden files: style redesigns and unrelated route changes.
- Final integration: one owner applies all changes, validates, deploys, and records evidence.
- Shared files/contracts: `Answer.state`, `Answer.can_open`, `StepSubmission.isCompleted`, `StepSubmission.isChecked`.
- Validation owner: integration owner.
- Merge order: docs -> backend/frontend/smoke -> build -> deploy -> post-deploy verification.

## Validation Commands

- `git diff --check`
- `npm run build`
- `npm run build:frontend`
- `SKIP_MUTATING_SMOKE=true ./scripts/deploy.sh legacy-progression-20260629`
- read-only pod schedule query for `fc2f9975-9151-49df-9297-4228d7d2891b`

## Intent Preservation Chain

- Vision: Marathon keeps participants moving through daily language practice without losing access to opened work.
- Goal Impact: Completed-but-unchecked stages remain usable while review state stays meaningful.
- System: `SYS-001-marathon-platform`.
- Feature: Assignment submissions and participant schedule progression.
- Task: `TASK-MAR-072-restore-legacy-completed-step-progression`.
- Execution Plan: this file.
- Coding Prompt: `PROMPT-TASK-MAR-072-restore-legacy-completed-step-progression`.
- Code: see task scope.
- Validation: `VAL-TASK-MAR-072-restore-legacy-completed-step-progression`.
