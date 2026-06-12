# Marathon Business Case

```yaml
id: MAR-BUSINESS-CASE
status: reviewed
owner: Product Owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/01_vision/VISION.md
downstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Problem

Marathon needs to launch safely with real catalog content and paid/VIP workflows while avoiding accidental exposure or overwrite of production participant progress.

## Users

- Prospective participants registering for an active language marathon.
- Authenticated participants continuing assignments and VIP upgrade.
- Operators loading approved catalog data and checking launch readiness.
- Support staff diagnosing registration, payment, gift, or assignment issues.

## Value

- Participants get a clear route from registration to assignment progress.
- Operators can see whether the product is launch-ready before traffic is sent to it.
- Payment and gift unlocks are auditable.
- AI-assisted development remains bounded by original product intent.

## Success Metrics

| ID | Metric | Target |
|---|---|---|
| BM-001 | Catalog launch readiness | Readiness preflight passes for at least one active language catalog. |
| BM-002 | VIP verification | At least one participant completes payment or gift upgrade and sees post-gate access. |
| BM-003 | Assignment verification | At least one authenticated participant can submit and reload an assignment report. |
| BM-004 | Documentation compliance | Every coding task has task, goal impact, execution plan, context package, and validation report. |

## Risk Controls

- Use catalog-only loader for approved source data.
- Keep full-export loaders disabled.
- Require explicit `--mutating` flags for live journey smoke actions.
- Keep secrets out of documentation and prompts.
- Document all contract/schema changes before coding.
