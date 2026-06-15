# Marathon Validation Debt Ledger

Date created: 2026-06-14
Owner: Engineering governance
Scope: Known validation failures or blockers not caused by the current task.

## Intent Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

This ledger records known validation failures that are repeatedly rediscovered during Marathon work. It does not excuse current-task failures. If a failure affects the active task acceptance criteria, promote it from debt to blocker.

## Rules

- Do not include secrets, tokens, raw production data, full gift-code inventories, participant exports, or private report payloads.
- Every entry needs an owner, scope, and unblock condition.
- Treat debt as non-blocking only when the active task does not change the affected behavior.
- Use `[MISSING: ...]` or `[UNKNOWN: ...]` when facts are unavailable.

## Entries

| ID | Date | Command | Failure Summary | Scope | Owner | Blocks Current Task? | Unblock Condition | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VD-MAR-001 | 2026-06-14 | `npm run check:readiness`; `npm run check:journey -- --base-url https://marathon.alfares.cz`; `npm run load:catalog:pod -- <catalog.json>` dry run/apply sequence | Production launch readiness and final registration/payment/assignment journey verification remain blocked when source-owner-approved active catalog data is missing: active marathon, VIP product, gift availability, trial/gated steps, and approved plain-text `assignmentContent`. | Production launch readiness, catalog apply, mutating journey validation | Product Owner owns catalog values; Engineering owns loader/readiness validation | No, for unrelated docs/code tasks. Yes, for launch, catalog apply, registration opening, VIP checkout/gift verification, or mutating journey closure. | Source owner provides approved catalog JSON without participant/progress/payment secrets; dry run and redacted approval packet are reviewed; apply completes; readiness and guarded journey checks pass with sanitized evidence. | `docs/intent/01_vision/VISION.md`; `docs/intent/05_subsystems/SUB-001-registration-catalog.md`; `docs/intent/05_subsystems/SUB-002-vip-payments.md`; `docs/intent/05_subsystems/SUB-003-assignment-submissions.md`; `docs/intent/13_context_packages/CP-TASK-MAR-007.md`; `docs/marathon-catalog-approval-checklist.md` |

## Current-Task Decision Checklist

- Does the failing command touch files changed by this task?
- Does the failure mention this task ID, goal ID, or changed module?
- Is the failure already listed above with `Blocks Current Task? = no`?
- Did the failure exist before this task started?
- Is the validation command required by the current task acceptance criteria?

## Agent Reporting Format

```text
Validation debt check:
- Command:
- Result:
- Matched ledger entry:
- Current-task impact:
- Next action:
```
