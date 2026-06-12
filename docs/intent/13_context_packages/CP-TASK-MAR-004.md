# CP-TASK-MAR-004: Context Package for VIP and Assignment Journey Verification

```yaml
id: CP-TASK-MAR-004
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/21_execution_plans/EP-TASK-MAR-004.md
downstream:
  - docs/intent/14_prompts/PROMPT-TASK-MAR-004.md
related_adrs:
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
  - docs/intent/07_decisions/ADR-003-payment-attempt-ledger.md
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
```

## Target Task

`TASK-MAR-004`: verify end-to-end VIP and assignment flow.

## Upstream Traceability

- Vision goals: VG-001 through VG-005.
- Feature: `FEAT-001`.
- Goal impact: `GOAL-IMPACT-TASK-MAR-004`.

## Included Documents

- `README.md`
- `SYSTEM.md`
- `TASKS.md`
- `docs/marathon-catalog-import.md`
- `docs/intent/00_constitution/CONSTITUTION.md`
- `docs/intent/01_vision/VISION.md`
- `docs/intent/17_governance/PROJECT_INVARIANTS.md`
- `docs/intent/21_execution_plans/EP-TASK-MAR-004.md`
- `docs/intent/12_validation/VAL-TASK-MAR-004.md`

## Excluded Documents

- Production `.env` files.
- Raw JWTs, payment callback keys, full gift code inventories, private participant reports.
- Archived legacy exports containing participant progress.

## Constraints

- Do not code unless a new task chain is created.
- Do not import progress or winners.
- Do not weaken readiness checks.
- Do not paste secrets or raw participant data into reports.
- Use masked IDs in validation evidence.

## Agent Prompt

Verify whether Marathon is ready for live registration, VIP unlock, and assignment submission. Start with documentation and readiness checks. Use only approved catalog data. If source data is absent, report the blocker; do not invent data.

## Validation Instructions

Run the commands in the execution plan and update `docs/intent/12_validation/VAL-TASK-MAR-004.md` with pass/fail evidence and recommendation.
