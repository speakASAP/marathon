# Marathon Intent Preservation System

```yaml
id: MAR-IPS-README
status: reviewed
owner: Product Owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - /Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system/README.md
downstream:
  - docs/intent/00_constitution/CONSTITUTION.md
  - docs/intent/01_vision/VISION.md
  - docs/intent/17_governance/PROJECT_INVARIANTS.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

This directory applies the company Intent Preservation System (IPS) to Marathon. It keeps original product intent traceable from vision through implementation, validation, deployment, and future AI-assisted coding sessions.

## Required Delivery Chain

Every coding task must preserve this chain before code is changed:

```text
Constitution
  -> Vision
  -> Business Case
  -> Domain Model
  -> System
  -> Subsystem
  -> Feature
  -> Task
  -> Goal Impact Record
  -> Execution Plan
  -> Context Package
  -> Coding Prompt
  -> Code
  -> Validation Report
  -> Audit / Readiness Evidence
```

## Current Seeded Chain

The active seeded chain covers the current launch blocker: approved catalog data and end-to-end VIP/assignment verification.

| Layer | Artifact |
|---|---|
| Constitution | `00_constitution/CONSTITUTION.md` |
| Vision | `01_vision/VISION.md` |
| Business case | `02_business_case/BUSINESS_CASE.md` |
| System | `04_systems/SYS-001-marathon-platform.md` |
| Subsystems | `05_subsystems/SUB-001-registration-catalog.md`, `SUB-002-vip-payments.md`, `SUB-003-assignment-submissions.md` |
| Feature | `10_features/FEAT-001-launch-ready-catalog-flow.md` |
| Task | `11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md` |
| Goal impact | `22_goal_impact/GOAL-IMPACT-TASK-MAR-004.md` |
| Execution plan | `21_execution_plans/EP-TASK-MAR-004.md` |
| Context package | `13_context_packages/CP-TASK-MAR-004.md` |
| Coding prompt | `14_prompts/PROMPT-TASK-MAR-004.md` |
| Validation template | `12_validation/VAL-TASK-MAR-004.md` |

Reusable templates live under `18_templates/`.

## Non-Negotiable Workflow

1. Read `00_constitution/CONSTITUTION.md`, `01_vision/VISION.md`, `17_governance/PROJECT_INVARIANTS.md`, and the task-specific context package.
2. Confirm the task traces to a feature, subsystem, system, business case, and vision goal.
3. Run the pre-coding checklist in `16_operations/PRE_CODING_GATE.md`.
4. Only then modify code.
5. Run the task validation plan.
6. Record validation evidence before commit, merge, deploy, or closure.

## Missing Information Policy

Use the exact marker `[MISSING: ...]` for information that cannot be derived from existing approved documents. Do not replace missing human-owned data with AI assumptions.
