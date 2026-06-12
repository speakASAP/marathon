# TASK-MAR-004: Verify End-to-End VIP and Assignment Flow

```yaml
id: TASK-MAR-004
status: blocked
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
goal_impact:
  - docs/intent/22_goal_impact/GOAL-IMPACT-TASK-MAR-004.md
execution_plan:
  - docs/intent/21_execution_plans/EP-TASK-MAR-004.md
```

## Objective

Verify the production user journey from registration through VIP unlock and assignment submission without importing unsafe historical progress data.

## Upstream Links

- Vision goals: VG-001, VG-002, VG-003, VG-004, VG-005.
- System: `docs/intent/04_systems/SYS-001-marathon-platform.md`.
- Feature: `docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md`.

## Goal Impact

This task is the release proof that Marathon can safely accept participants and unlock VIP content using approved catalog data and validated payment/gift/submission behavior.

## Project Invariant Impact

- MAR-INV-001: Traceability required.
- MAR-INV-002: Human-approved catalog source required.
- MAR-INV-003: No unsafe progress import.
- MAR-INV-004: Payment/gift unlocks must be auditable.
- MAR-INV-005: Assignment content must be plain text.
- MAR-INV-006: Validation evidence required before closure.

## Sensitive-Data Classification

Classification: sensitive.

The task may use live participant, payment, gift, and submission data. Prompts and reports must not include raw secrets, full gift-code inventories, payment callback keys, JWTs, or participant private data. Use masked identifiers in validation evidence.

## Contract/Schema Impact

No schema change is planned for verification. If verification reveals a missing API/schema field, create a new task and execution plan before coding.

## Replay/Determinism Impact

Readiness checks are deterministic. Mutating journey checks are not replay-safe unless they use explicit approved test inputs and document created participant/order/gift state.

## Scope

- Confirm approved catalog data exists or identify missing classes.
- Run catalog dry-run if source JSON is provided.
- Run production readiness preflight.
- Run read-only journey smoke.
- Run guarded mutating journey checks only with approved auth token, participant, product/gift/test payment path, and explicit `--mutating`.
- Record validation report.

## Non-Goals

- Do not create code changes as part of verification unless a separate task is created.
- Do not import archived participant progress.
- Do not invent catalog content or gift codes.
- Do not expose secrets in documentation.

## Acceptance Criteria

- [ ] Approved catalog JSON source is identified or missing source is documented.
- [ ] Readiness preflight passes for at least one active language.
- [ ] Registration creates or identifies a participant in the active marathon.
- [ ] VIP unlock succeeds through payment or gift code and post-gate access is visible.
- [ ] Assignment submission can be saved and read back.
- [ ] Validation report is completed with evidence and recommendation.

## Required Context

- `docs/intent/00_constitution/CONSTITUTION.md`
- `docs/intent/01_vision/VISION.md`
- `docs/intent/17_governance/PROJECT_INVARIANTS.md`
- `docs/intent/21_execution_plans/EP-TASK-MAR-004.md`
- `docs/intent/13_context_packages/CP-TASK-MAR-004.md`
- `README.md`
- `SYSTEM.md`
- `TASKS.md`
- `docs/marathon-catalog-import.md`

## Validation Task

Complete `docs/intent/12_validation/VAL-TASK-MAR-004.md` with command evidence, masked IDs, pass/fail criteria, deviations, and recommendation.

## Required Gates

- Pre-coding gate/checklist before any source edit.
- Sensitive-data scan for validation artifacts.
- Readiness preflight.
- Journey smoke verification.
- Deployment-readiness gate before release closure if code changed.

## Execution Plan Requirement

This task must not be converted into a coding prompt until `docs/intent/21_execution_plans/EP-TASK-MAR-004.md` is reviewed for the current production state.
