---
id: TASK-MAR-070
title: Define unified assignment and report rendering contract
status: implementation-reviewed
feature: FEAT-001
subsystem: SUB-003
priority: 1
---

# TASK-MAR-070: Define Unified Assignment And Report Rendering Contract

## Objective

Unify Marathon assignment content, participant inputs, report generation, peer report rendering, and related review/progress boundaries under one shared safe contract for every active marathon and every step.

## Intent Preservation Chain

- Vision: Marathon participants can register, complete scheduled assignments, submit reports, review peer examples, and track progress across active language marathons without page-specific behavior drift.
- Goal Impact: A shared contract protects the verified active catalog baseline of 13 active marathons and 377 current steps by making assignment/report behavior consistent across all pages and APIs.
- System: `SYS-001` Marathon platform.
- Feature: `FEAT-001` launch-ready catalog, VIP, and assignment flow.
- Task: `TASK-MAR-070` contract definition and implementation handoff.
- Execution Plan: Documentation, backend contract enforcement, read-only auditor, frontend shared renderer extraction, and final runtime validation were split into independent workstreams with integration ownership in the original thread.
- Coding Prompt: Worker prompts bounded write scopes for docs, auditor, frontend renderer, and integration-owner backend contract alignment.
- Code: `src/steps/assignment-contract.ts`, `src/answers/answers.service.ts`, `src/submissions/submissions.service.ts`, `frontend/src/components/StepAssignmentRenderer.tsx`, `frontend/src/components/assignment/*`, and `scripts/check-assignment-contract.js`.
- Validation: `docs/intent/12_validation/VAL-TASK-MAR-070.md`.

## Scope

- Document the canonical structured assignment block contract.
- Define how content blocks, input blocks, branch visibility, report generation, peer report rendering, review/NPS/progress report boundaries, and readiness validation must behave.
- Preserve ADR-004 safety: no raw HTML, no Django template execution, no route-specific rich-content shortcuts.
- Require future visual or behavior changes for step content to land in the shared renderer/contract layer.
- Set validation expectations for all 13 active marathons and all 377 current steps.

## Non-Goals

- No Prisma schema, catalog value, participant data migration, payment behavior, gift-code behavior, or NPS schema changes.
- No deploy in the documentation/auditor/frontend/backend implementation workstreams; deployment remains a final integration action.
- No catalog value changes, participant data migration, payment behavior changes, gift-code changes, or NPS schema changes.

## Canonical Contract

### Content Blocks

Content blocks describe instructional content only. Approved categories are text, heading or lead text when supported, list, quote, link, video, audio, and catalog-approved reference blocks. Content blocks must be normalized and rendered as inert UI, never as raw HTML or executable templates.

Legacy Django tags map to structured blocks:

- `{% video %}` maps to a `video` block with an approved code/provider contract.
- `{% audio %}` maps to an `audio` block with an approved code/source contract.
- Plain paragraphs map to text blocks.
- Any unsupported Django tag remains rejected or inert until a future ADR defines a structured equivalent.

### Input Blocks

Input blocks define participant-answer fields. Each field needs a stable name/id, label, field type, required flag, choices when applicable, and optional branch metadata. `{% render_field %}` maps to this block type, not to rendered HTML.

The input contract owns:

- Draft payload shape.
- Final submission payload shape.
- Required-answer checks.
- Human-readable answer rows.
- Safe fallback to text report when no structured public answers exist.

### Branch Visibility

Branch visibility must be applied consistently across:

- Assignment rendering.
- Required-field validation.
- Draft and final submission display.
- Peer report generation.
- Saved submission readback.
- Progress or support surfaces that summarize assignment answers.

Valid branch values are the contract-supported learning paths, currently `beginner`, `medium`, `advanced`, and `beginner-medium`. Unknown branch values must not silently create visible behavior differences; they must be normalized, rejected, or reported by validation.

### Report Generation

Reports are participant-owned submissions. The canonical report output must be generated from visible public input blocks for the participant's branch, with a plain-text fallback only when structured public answer rows are unavailable.

Report generation must not include:

- Hidden branch fields.
- Diagnostic legacy keys.
- Raw JSON dumps.
- Participant private identifiers.
- JWTs, payment data, gift-code values, checkout URLs, or secrets.
- Full assignment content copied into validation artifacts.

### Peer Report Rendering

Peer reports may show a safe participant display name, completion timestamp, visible answer rows, and safe plain-text fallback. Peer report rendering must use the same field labels, choice labels, branch visibility, and filtering rules as report generation.

### Review, NPS, And Progress Boundaries

Review pages, winner detail pages, NPS survey forms, profile progress reports, readiness reports, support knowledge, and operations dashboards are adjacent surfaces, not separate assignment renderers. They may consume safe aggregate or explicitly public outputs from the shared contract. They must not parse assignment text, execute template tags, render raw HTML, or expose unfiltered submission payloads.

## Acceptance Criteria

- ADR-008 exists and defines the shared renderer/contract rule.
- This task states the structured replacement for Django `{% video %}`, `{% audio %}`, and `{% render_field %}`.
- The contract covers content blocks, input blocks, branch visibility, report generation, peer report rendering, and review/NPS/progress boundaries.
- The task explicitly requires future step content visual/behavior changes to be made in the shared renderer/contract layer.
- Validation expectations cover all 13 active marathons and all 377 current steps.
- Sensitive-data handling remains explicit and forbids raw report payloads or private participant data in validation records.

## Parallel Execution

| Workstream | Status | Owner Role | Scope | Allowed Files | Forbidden Files | Dependencies | Validation Evidence | Handoff Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Contract docs | ready now | Worker A | ADR, task, docs validation evidence | `docs/intent/07_decisions/ADR-008-unified-assignment-renderer-contract.md`, `docs/intent/11_tasks/TASK-MAR-070-unified-assignment-report-contract.md`, `docs/intent/12_validation/VAL-TASK-MAR-070.md` | `frontend/**`, `src/**`, `scripts/**`, `prisma/**`, package files, public built assets | Existing IPS docs | `git diff --check` | This file is the handoff artifact. |
| Backend contract enforcement | complete | Integration owner | Normalize branch visibility, required answers, and public peer report generation through shared backend utility | `src/steps/assignment-contract.ts`, `src/answers/answers.service.ts`, `src/submissions/submissions.service.ts` | Prisma schema, participant data, payment/gift/NPS behavior | ADR-008 and this task | `npm run build`, `git diff --check` | Centralizes backend report/required-answer semantics. |
| Shared renderer extraction | complete | Frontend implementation agent | Shared renderer used by all step-content surfaces | `frontend/src/components/StepAssignmentRenderer.tsx`, `frontend/src/components/assignment/*` | Pages, backend, scripts, public built assets except generated production bundle | ADR-008 and backend contract | `npm run build:frontend`, `git diff --check` | Centralizes videos, audio, text, fields, and renderer-derived display blocks. |
| Cross-catalog validation | deployment-gated | Validation owner | Validate all active marathons and steps with the read-only auditor | `scripts/check-assignment-contract.js`, validation docs | Runtime secrets and raw private data in artifacts | Implementation workstreams complete and deployed into pod | Exact active marathon count, step count, route checks, and sanitized failures | Current expected baseline is 13 active marathons and 377 steps; direct checkout DB validation is blocked by cluster-only DNS. |

Shared files/contracts: assignment block schema, branch visibility rules, submission payload shape, report generation rules, peer report display rules, and sensitive-data policy.

Integration owner: original thread Codex session.

Validation owner: original thread Codex session.

Merge order: contract docs first, backend contract enforcement second, shared renderer extraction third, read-only auditor fourth, generated frontend bundle last, cross-catalog pod validation after deploy.

## Validation

See `docs/intent/12_validation/VAL-TASK-MAR-070.md`.
