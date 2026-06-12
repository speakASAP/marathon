# ADR-001: Adopt Intent Preservation System for Marathon

```yaml
id: ADR-001
status: accepted
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - /Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system/README.md
  - docs/intent/00_constitution/CONSTITUTION.md
downstream:
  - docs/intent/README.md
related_adrs: []
```

## Context

Marathon has production-critical participant, payment, gift, and assignment flows. Recent work showed that unsafe historical exports and missing catalog data can create launch risk if AI agents act from incomplete context.

## Decision

Adopt the company Intent Preservation System locally under `docs/intent/`. Future coding work must have traceability, execution plan, context package, validation plan, and gate evidence before code changes are committed.

## Consequences

- Documentation work may precede coding work.
- Missing human-owned data must remain explicit.
- AI agents must not start implementation from vague instructions.
- Validation reports become required closure evidence.

## Validation

Check new tasks for upstream traceability, explicit scope, non-goals, invariant impact, sensitive-data handling, and validation plan.
