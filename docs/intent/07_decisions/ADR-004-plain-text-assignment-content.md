# ADR-004: Render Assignment Content as Plain Text

```yaml
id: ADR-004
status: accepted
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/05_subsystems/SUB-003-assignment-submissions.md
downstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Context

Assignment content and peer reports come from catalog/submission data and must not introduce HTML injection risk.

## Decision

Render assignment instructions and peer reports as plain text. Any future rich-text support requires a new ADR, sanitizer contract, and validation report.

## Consequences

- Approved `assignmentContent` remains required for every step.
- Frontend must not use raw HTML rendering for assignment content or peer reports.
- Catalog review must inspect plain-text instructions before launch.

## Validation

Readiness and journey checks fail missing assignment content. Code review rejects `dangerouslySetInnerHTML` for this content class unless a future ADR supersedes this one.
