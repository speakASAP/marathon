# Marathon Change Control

```yaml
id: MAR-CHANGE-CONTROL
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/00_constitution/CONSTITUTION.md
  - docs/intent/01_vision/VISION.md
downstream:
  - docs/intent/16_operations/PRE_CODING_GATE.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

Control how Marathon intent, architecture, contracts, data handling, and validation rules change over time.

## Protected Documents

- `docs/intent/00_constitution/CONSTITUTION.md`
- `docs/intent/01_vision/VISION.md`
- `docs/intent/17_governance/PROJECT_INVARIANTS.md`
- ADRs under `docs/intent/07_decisions/`

## Change Requirements

| Change Type | Required Documentation |
|---|---|
| Product intent change | Amendment proposal, vision impact, feature/task updates, validation impact. |
| Architecture or integration change | ADR update or new ADR, contract validation plan, rollback plan. |
| API/schema/payment/catalog change | Task, execution plan, contract validation evidence, validation report. |
| Production data migration | Data-protection review, migration task, dry-run evidence, rollback plan, validation report. |
| UI behavior change | Feature/task traceability, journey validation evidence, readiness-state review. |

## AI Agent Rule

If the requested change conflicts with a protected document, the agent must stop and request human amendment approval before coding.
