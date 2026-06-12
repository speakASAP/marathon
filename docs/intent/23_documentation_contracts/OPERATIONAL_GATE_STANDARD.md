# Marathon Operational Gate Standard

```yaml
id: MAR-OPERATIONAL-GATE-STANDARD
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - /Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system/23_documentation_contracts/OPERATIONAL_GATE_STANDARD.md
downstream:
  - docs/intent/16_operations/PRE_CODING_GATE.md
  - docs/intent/16_operations/DEPLOYMENT_READINESS_GATE.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Gate Types

| Gate | Timing | Blocks On |
|---|---|---|
| Pre-coding | Before source edits or commit. | Missing traceability, task, execution plan, context package, validation plan, invariant impact, sensitive-data handling, contract/replay declaration. |
| Integration readiness | Before combining independently developed changes. | Failed contracts, missing replay evidence, invariant violations, or incomplete test evidence. |
| Deployment readiness | Before release, merge, deployment closure, or task completion. | Failed pre-coding gate, failed tests/checks, missing validation report, unresolved closure-critical missing markers, protected intent changes. |

## Evidence Required

Each gate result must state:

- command or checklist used;
- repository root;
- target task/plan;
- status;
- failed checks;
- invariant evidence;
- sensitive-data result;
- next action.

## Failure Policy

Failed gates block the next delivery phase. Do not weaken a gate to pass. Fix the artifact, document an owner-approved exception, or split the task.
