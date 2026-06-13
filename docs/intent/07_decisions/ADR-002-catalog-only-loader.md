# ADR-002: Use Catalog-Only Loader for Marathon Launch Data

```yaml
id: ADR-002
status: accepted
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/00_constitution/CONSTITUTION.md
  - docs/intent/05_subsystems/SUB-001-registration-catalog.md
downstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Context

The historical legacy exporter included participants, answers, and winners. Current production launch needs approved catalog rows, not unsafe bulk progress migration.

## Decision

Use `scripts/load-marathon-catalog.js` as the only documented data-load path for launch catalog data. Keep direct full-export loaders disabled unless a future approved migration chain replaces this decision.

Local or experimental full-migration scripts, including `scripts/migrate-legacy-marathon-full.js`, are not part of the accepted launch path. They must not be committed, documented as operator commands, or run against production without a replacement ADR, source-owner migration plan, rollback plan, and sensitive-data validation.

## Consequences

- Approved catalog JSON must be provided by a human/source of truth.
- Dry run is the default.
- `--apply` creates only catalog entities.
- User/progress keys are rejected.
- Full legacy migrations that include participants, answers/submissions, winners, or payment state remain out of scope for launch.

## Validation

Run catalog dry run, readiness preflight, and journey smoke after approved data is loaded.
