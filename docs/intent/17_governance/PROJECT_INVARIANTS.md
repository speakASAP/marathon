# Marathon Project Invariants

```yaml
id: MAR-PROJECT-INVARIANTS
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
  - docs/intent/16_operations/DEPLOYMENT_READINESS_GATE.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

Project invariants are non-negotiable rules that every coding task, validation report, and deployment decision must preserve.

## Invariants

| ID | Level | Source | Rule | Forbidden Outcome | Validation Method | Gate | Owner |
|---|---|---|---|---|---|---|---|
| MAR-INV-001 | constitutional | Constitution | Implementation work must remain traceable to upstream intent. | Code changes without task/plan/context/validation chain. | Pre-coding gate. | Pre-coding | Engineering |
| MAR-INV-002 | product | Vision VG-001 | Registration opens only for approved launch-ready catalog data. | Public registration for partial or invented catalog rows. | Readiness preflight and catalog loader checks. | Pre-coding, deployment | Product Owner |
| MAR-INV-003 | data | Constitution | Do not bulk-import archived participant progress without approved migration chain. | Importing participants, answers, winners, submissions, or payment state through legacy full-export path. | Loader rejection and audit review. | Pre-coding, deployment | Engineering |
| MAR-INV-004 | product | ADR-003 | VIP unlock requires payment-attempt match or valid unused gift redemption. | Callback unlock from unverified payload or reused gift. | API tests, readiness, journey evidence. | Pre-coding, deployment | Engineering |
| MAR-INV-005 | security | ADR-004 | Assignment content and peer reports render as plain text. | Raw HTML injection for assignment/report content. | Code review and journey smoke. | Pre-coding, deployment | Engineering |
| MAR-INV-006 | operational | Vision VG-004 | Validation evidence is required before closure. | Marking work complete without report and command evidence. | Validation report audit. | Deployment | Engineering |
| MAR-INV-007 | UX | Vision VG-005 | UI must distinguish closed catalog, API failure, auth required, and not found states. | Misleading start/upgrade/gift promises when readiness is absent. | Journey smoke and visual/code review. | Deployment | Product Owner |
| MAR-INV-008 | sensitive-data | Constitution | Prompts, docs, tests, and reports must not contain secrets or raw production private data. | JWTs, callback keys, full gift codes, or private reports stored in docs. | Sensitive-data scan/review. | Pre-coding, deployment | Engineering |

## Exception Process

Exceptions require an amendment or ADR, explicit owner approval, affected artifacts list, validation impact, and rollback plan.
