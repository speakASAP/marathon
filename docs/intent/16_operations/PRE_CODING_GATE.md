# Marathon Pre-Coding Gate

```yaml
id: MAR-PRE-CODING-GATE
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/23_documentation_contracts/OPERATIONAL_GATE_STANDARD.md
downstream:
  - docs/intent/21_execution_plans/EP-TASK-MAR-004.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

This gate must pass before coding starts or before source changes are committed.

## Blocking Checks

1. Task document exists under `docs/intent/11_tasks/`.
2. Task has upstream links, goal impact, invariant impact, sensitive-data classification, contract/schema impact, replay/determinism impact, acceptance criteria, and required gates.
3. Goal impact record exists under `docs/intent/22_goal_impact/`.
4. Execution plan exists under `docs/intent/21_execution_plans/`.
5. Context package exists under `docs/intent/13_context_packages/`.
6. Coding prompt exists or the task is explicitly verification-only.
7. Protected constitution/vision changes are not part of the coding diff unless human-approved amendment exists.
8. No secrets, JWTs, callback keys, full gift codes, or raw participant private data are present in prompts or reports.
9. If APIs, schema, payment callback, readiness output, or catalog format change, contract validation is planned.
10. If mutating checks are required, replay/idempotency handling is documented.

## Manual Command Pattern

Until IPS scripts are vendored into Marathon, perform the gate by reading:

```bash
sed -n '1,240p' docs/intent/11_tasks/<task>.md
sed -n '1,320p' docs/intent/21_execution_plans/<plan>.md
sed -n '1,220p' docs/intent/13_context_packages/<context>.md
sed -n '1,240p' docs/intent/17_governance/PROJECT_INVARIANTS.md
```

## Pass Output

Record gate result in the validation report:

```text
Pre-coding gate: pass/fail
Task:
Execution plan:
Context package:
Sensitive-data result:
Contract impact:
Replay impact:
Blockers:
```
