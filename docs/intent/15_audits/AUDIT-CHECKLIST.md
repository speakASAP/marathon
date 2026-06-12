# Marathon IPS Audit Checklist

```yaml
id: MAR-AUDIT-CHECKLIST
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md
downstream:
  - docs/intent/16_operations/PRE_CODING_GATE.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Required Checks

- [ ] Task traces to feature, subsystem, system, business case, and vision goal.
- [ ] Goal impact record exists.
- [ ] Execution plan exists and defines scope, non-goals, files, tests, validation, rollback, and handoff prompt.
- [ ] Context package includes only necessary docs.
- [ ] Sensitive-data classification is declared.
- [ ] Contract/schema impact is declared.
- [ ] Replay/determinism impact is declared.
- [ ] Project invariants are referenced.
- [ ] Validation report exists before closure.
- [ ] `[MISSING: ...]` markers are either resolved or explicitly accepted as blockers.

## Audit Finding Format

Use this format for findings:

```text
Severity:
Artifact:
Issue:
Impact:
Required remediation:
Owner:
```
