# Marathon Documentation Completeness Standard

```yaml
id: MAR-DOC-COMPLETENESS-STANDARD
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - /Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system/23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md
downstream:
  - docs/intent/15_audits/AUDIT-CHECKLIST.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Metadata Requirement

Every major IPS document should begin with:

```yaml
id: DOC-ID
status: draft | reviewed | approved | deprecated
owner: TBD
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
completeness_level: missing | skeletal | partial | complete | validated
upstream:
  - path/to/upstream.md
downstream:
  - path/to/downstream.md
related_adrs:
  - ADR-xxx
```

## Missing and Unknown Markers

Use exact markers:

```text
[MISSING: describe what is missing and who should provide it.]
[UNKNOWN: describe what is unknown and how to discover it.]
```

## Required Sections

Tasks must include objective, upstream links, goal impact, invariant impact, sensitive-data classification, contract/schema impact, replay/determinism impact, scope, non-goals, acceptance criteria, required context, validation task, and required gates.

Execution plans must include metadata, upstream traceability, goal impact, invariants, sensitive-data handling, contract validation, replay/determinism, scope, non-goals, files, implementation steps, tests, validation, gates, documentation updates, rollback, handoff prompt, and completion checklist.

Validation reports must include target, scope, evidence, gate evidence, invariant evidence, sensitive-data evidence, replay/determinism evidence, passed/failed criteria, deviations, recommendation, and traceability confirmation.

## Closure Rule

A task with unresolved `[MISSING: ...]` markers in acceptance, validation, sensitive-data, or gate sections cannot be closed unless the marker itself is accepted as a documented blocker by the owner.
