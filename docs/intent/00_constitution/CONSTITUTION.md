# Marathon Project Constitution

```yaml
id: MAR-CONSTITUTION
status: reviewed
owner: Product Owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - /Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system/00_constitution/CONSTITUTION.md
downstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/17_governance/PROJECT_INVARIANTS.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

This constitution protects Marathon from intent drift, unsafe data import, undocumented architecture changes, and AI-generated code that is not traceable to product goals.

## Constitutional Principles

### 1. Preserve participant trust

Marathon must support real participant registration, assignment progress, VIP access, gift redemption, and winner visibility without exposing or corrupting participant data.

### 2. Preserve original launch intent

The project exists to run a production Marathon product backed by approved course catalog data, authenticated participant profiles, gated VIP access, assignment submissions, and operational readiness checks.

### 3. Human approval for source-of-truth catalog data

AI agents must not invent course catalog content, assignment instructions, prices, gift codes, or production participant data. Catalog data that affects registration, payments, or assignments must come from a human-approved source.

### 4. No bulk progress import without explicit approval

Historical participant progress, answers, winners, payment state, and submissions must not be bulk imported unless a human-approved migration plan, data-protection review, and validation report exist.

### 5. Documentation before implementation

No coding task may begin until a task, goal impact record, execution plan, required context, and validation plan exist.

### 6. Traceability

Every coding task must trace through:

```text
Vision Goal -> System -> Subsystem -> Feature -> Task -> Execution Plan -> Validation Report
```

### 7. Payment and gift safety

VIP access may only be unlocked by validated payment callback, recorded payment attempt match, or valid unused gift code redemption.

### 8. Plain-text assignment safety

Assignment instructions and peer reports must be rendered as plain text unless a future approved ADR introduces a sanitized rich-text format.

### 9. Operational evidence

Readiness, journey smoke, pre-coding, and deployment checks must produce evidence before work is closed.

## Amendment Process

Changes to this constitution or the Marathon vision require:

1. A proposal under `docs/intent/17_governance/amendments/`.
2. Impact list for systems, features, tasks, data handling, and validation.
3. Human approval.
4. Updated ADR when architecture or integration behavior changes.
5. Updated validation report after implementation.

## AI Agent Restrictions

AI agents must not:

- change this constitution or `01_vision/VISION.md` without explicit human instruction;
- invent production catalog or participant data;
- weaken launch readiness checks to make deployment pass;
- bypass payment-attempt matching;
- remove validation criteria;
- convert vague product requests into code without a documented task and execution plan.
