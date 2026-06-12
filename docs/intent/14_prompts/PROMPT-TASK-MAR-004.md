# PROMPT-TASK-MAR-004: Verification Agent Prompt

```yaml
id: PROMPT-TASK-MAR-004
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/13_context_packages/CP-TASK-MAR-004.md
downstream:
  - docs/intent/12_validation/VAL-TASK-MAR-004.md
related_adrs:
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
  - docs/intent/07_decisions/ADR-003-payment-attempt-ledger.md
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
```

## Task Summary

Verify Marathon production readiness for approved catalog registration, VIP payment/gift unlock, and assignment submission.

## Execution Plan Link

`docs/intent/21_execution_plans/EP-TASK-MAR-004.md`

## Required Context

Read the context package and all documents listed in it before running commands.

## Allowed Changes

- Validation report updates.
- `TASKS.md` status update after evidence is collected.
- `SYSTEM.md` Current State update after verified production behavior changes.

## Forbidden Changes

- Source-code changes.
- Secret files or runtime secret values.
- Constitution/vision changes.
- Full-export progress import.
- Invented catalog, assignment, payment, participant, or gift data.

## Implementation Instructions

This is a verification task. If code changes are required, stop and create a new IPS task chain before coding.

## Acceptance Criteria

- Approved catalog source is confirmed or blocker is documented.
- Readiness and journey commands are run where prerequisites exist.
- Sensitive values are masked.
- Validation report gives accept, accept-with-follow-up, or reject/rework recommendation.

## Validation Commands

```bash
npm run check:readiness
npm run check:journey -- --base-url https://marathon.alfares.cz
```

## Expected Output

An updated validation report with command evidence, masked IDs, blockers, and next action.
