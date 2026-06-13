# EP-TASK-MAR-004: Verify Production VIP and Assignment Journey

```yaml
id: EP-TASK-MAR-004
status: complete
source_task: docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-13
completeness_level: complete
```

## Metadata

- Target environment: production `https://marathon.alfares.cz`.
- Current blocker: none for registration, VIP payment unlock, and assignment submit/readback verification.
- Execution type: verification first; code changes only through a new task.

## Upstream Traceability

- Constitution: `docs/intent/00_constitution/CONSTITUTION.md`.
- Vision: `docs/intent/01_vision/VISION.md`.
- Business case: `docs/intent/02_business_case/BUSINESS_CASE.md`.
- System: `docs/intent/04_systems/SYS-001-marathon-platform.md`.
- Feature: `docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md`.
- Goal impact: `docs/intent/22_goal_impact/GOAL-IMPACT-TASK-MAR-004.md`.

## Goal Impact

Completing this plan proves that Marathon can move from implementation-complete to launch-verified while preserving catalog, payment, gift, and assignment integrity.

## Project Invariants

- MAR-INV-001: Preserve traceability.
- MAR-INV-002: Approved catalog source required.
- MAR-INV-003: No unsafe progress import.
- MAR-INV-004: Payment/gift unlock integrity.
- MAR-INV-005: Plain-text assignment content.
- MAR-INV-006: Evidence before closure.
- MAR-INV-007: Honest readiness UX.

## Sensitive-Data Handling

Classification: sensitive.

Validation may involve JWTs, participant IDs, order IDs, and gift codes. Store only masked IDs and command status in docs. Do not paste tokens, callback keys, full gift codes, payment payload secrets, or private participant text.

## Contract Validation Plan

No new contract is expected. Verify existing contracts:

- Readiness endpoint reports catalog readiness without secrets.
- Checkout creates payment attempt before payment handoff.
- Webhook validates order/product/amount/currency before VIP unlock.
- Submission readback API returns saved participant report for authenticated participant.

If any contract is missing, stop and create a new feature/task/ADR chain before coding.

## Replay/Determinism Plan

- Read-only checks are replay-safe.
- Mutating checks require explicit `--mutating` and approved inputs.
- Record generated participant/order/gift state as masked references only.
- Do not rerun gift redemption against the same single-use gift unless the plan explicitly expects failure.

## Scope

1. Locate approved catalog source. Completed on 2026-06-13 from the user-approved SpeakASAP legacy export/import staging flow.
2. Dry-run catalog load. Completed on 2026-06-13 with 13 active marathons, 377 steps with assignment content, 13 products, and 13 gift codes.
3. Apply catalog only after human approval. Completed on 2026-06-13 as part of the approved migration flow; full legacy import also reconciled 53,469 participants, 238,674 submissions, and 18,603 winners as masked aggregate evidence.
4. Run readiness preflight. Completed on 2026-06-13 from the Marathon pod.
5. Run read-only journey smoke. Completed on 2026-06-13 against `https://marathon.alfares.cz`.
6. Run mutating journey verification with approved test data. Completed on 2026-06-13 with a synthetic Auth user and masked evidence.
7. Complete validation report. Completed on 2026-06-13.

## Non-Goals

- No source-code edits.
- No direct database mutation outside approved loader or application APIs.
- No additional archived progress import inside this verification plan; the completed user-approved full legacy migration reports only masked aggregate evidence back here.
- No weakening readiness or smoke checks.

## Files to Inspect

- `README.md`
- `SYSTEM.md`
- `TASKS.md`
- `docs/marathon-catalog-import.md`
- `scripts/load-marathon-catalog.js`
- `scripts/check-marathon-readiness.js`
- `scripts/check-marathon-journey.js`
- `prisma/schema.prisma`

## Files to Create

- `docs/intent/12_validation/VAL-TASK-MAR-004.md` evidence updates.
- Optional report artifacts under `reports/validation/` when commands are run.

## Files to Modify

- Documentation only unless a new coding task is approved.
- If implementation changes are needed, create a new task, execution plan, context package, and validation report first.

## Files That Must Not Be Modified

- `docs/intent/00_constitution/CONSTITUTION.md`
- `docs/intent/01_vision/VISION.md`
- Production secrets or `.env` values.
- Direct full-export loader behavior except through a new approved ADR/task or the separate user-approved migration task already in progress.

## Implementation Steps

1. Confirm no source edit is required for the verification task.
2. Confirm approved catalog source and owner. If only legacy SpeakASAP fixture candidates are available, run `npm run audit:legacy-catalog` first and treat the output as redacted source-discovery evidence, not approval.
3. Run catalog dry run locally or in the runtime context:

```bash
npm run load:catalog -- /path/to/marathon-catalog.json
```

4. Apply catalog only after human approval:

```bash
npm run load:catalog -- /path/to/marathon-catalog.json --apply
```

5. Run readiness from the runtime pod:

```bash
kubectl exec -n statex-apps deploy/marathon -- sh -lc 'cd /app && npm run check:readiness'
```

6. Run read-only journey smoke:

```bash
npm run check:journey -- --base-url https://marathon.alfares.cz
```

7. Run guarded mutating verification only with approved inputs:

```bash
npm run check:journey -- --base-url https://marathon.alfares.cz --mutating [approved flags only]
```

8. Fill validation report with masked evidence.

## Test Plan

- Catalog loader dry run.
- Readiness preflight.
- Read-only journey smoke.
- Mutating journey smoke with approved test data.

## Validation Plan

Pass/fail is recorded in `docs/intent/12_validation/VAL-TASK-MAR-004.md`. The catalog, read-only launch gates, live registration, VIP payment unlock, and assignment submit/readback checks pass. New winner creation remains a follow-up verification item outside T4 acceptance criteria.

## Gate Commands

Use the project checklists because IPS scripts are not vendored into this repo:

```bash
sed -n '1,240p' docs/intent/16_operations/PRE_CODING_GATE.md
sed -n '1,260p' docs/intent/16_operations/DEPLOYMENT_READINESS_GATE.md
```

Product/runtime commands:

```bash
npm run check:readiness
npm run check:journey -- --base-url https://marathon.alfares.cz
```

## Documentation Updates

- Update `TASKS.md` when validation status changes.
- Update `SYSTEM.md` Current State after verified production behavior changes.
- Update validation report before closure.

## Rollback Plan

- If catalog apply created incorrect catalog rows, stop registration by deactivating the affected catalog through an approved operational action and document the incident.
- If code change becomes required, roll it back through normal git/deploy process and record validation failure.

## Agent Handoff Prompt

Read the context package at `docs/intent/13_context_packages/CP-TASK-MAR-004.md`. Do not write source code. Verify the active production catalog and VIP/assignment journey using the documented commands. Mask all sensitive data in reports. If verification fails due to missing implementation, stop and create a new IPS task chain before coding.

## Completion Checklist

- [x] Approved catalog source identified.
- [x] Catalog dry run completed.
- [x] Catalog apply approved and completed, if needed.
- [x] Readiness preflight passed.
- [x] Read-only journey smoke passed.
- [x] Mutating verification passed with approved inputs.
- [x] Validation report completed.
- [x] `TASKS.md` status updated.
