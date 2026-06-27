# ADR-008: Unified Assignment Renderer Contract

```yaml
id: ADR-008
status: accepted
owner: Engineering
created: 2026-06-27
last_updated: 2026-06-27
completeness_level: implementation-reviewed
upstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/04_systems/SYS-001-marathon-platform.md
  - docs/intent/05_subsystems/SUB-003-assignment-submissions.md
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
downstream:
  - docs/intent/11_tasks/TASK-MAR-070-unified-assignment-report-contract.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
```

## Context

Marathon now serves all active language marathons from a shared catalog baseline. Current validation evidence records 13 active marathons and 377 current steps with assignment content. The assignment experience is no longer a single page concern: the same step content and participant answers affect public step rendering, authenticated submission, autosaved drafts, peer report rendering, profile progress reports, winner/review surfaces, NPS boundaries, support knowledge, and operational readiness.

The legacy Django Marathon used template tags such as `{% video %}`, `{% audio %}`, and `{% render_field %}` inside assignment text. That pattern mixed content, behavior, form fields, and rendering decisions in one template-like string. Recreating it as raw HTML or template execution would reintroduce injection risk, make validation page-specific, and prevent the platform from proving that every active marathon follows the same rules.

ADR-004 requires plain-text assignment content and rejects raw HTML rendering for assignment content and peer reports unless superseded by a safer contract. This ADR does not authorize raw HTML. It defines a structured block contract that preserves ADR-004's safety intent while allowing controlled media, input, branching, and report behavior.

## Decision

Marathon assignment content, assignment inputs, peer reports, and related step rendering behavior must be expressed through a shared structured block contract and rendered by shared contract-aware code. Future visual or behavior changes for step content must be made in the shared renderer/contract layer, not in one marathon, one language page, or one route-specific exception.

The canonical contract is high level and versioned by task implementation:

- Content blocks: text, headings or lead text when explicitly supported, lists, quotes, links, video, audio, and catalog-approved known-word/reference sections. Each block must be normalized before rendering and must never execute HTML, JavaScript, Django template tags, or user-controlled markup.
- Input blocks: named fields with stable ids, labels, field type, required flag, and optional choices. Supported field types are bounded controls such as text, textarea, radio, and checkbox unless a future ADR adds more.
- Branch visibility: a block may be visible to all participants or to a declared learning branch such as `beginner`, `medium`, `advanced`, or `beginner-medium`. Branch filtering must be identical for assignment rendering, required-answer validation, peer report generation, and saved answer display.
- Report generation: participant submissions store structured payloads plus a text report fallback. Generated public/peer report text must be derived only from visible public input blocks, not from hidden fields, diagnostic legacy keys, or raw payload dumps.
- Peer report rendering: peer reports may show another participant name, completion time, visible answer rows, and safe report fallback text. They must not expose JWTs, participant private identifiers, payment data, gift codes, hidden fields, or raw assignment payloads.
- Review, NPS, and progress report boundaries: public reviews, winner reviews, NPS survey data, profile progress reports, readiness reports, and support knowledge may reference aggregate or explicitly public fields only. They must not become alternate renderers for assignment block HTML or unfiltered report payloads.

## Replaces Legacy Template Behavior

The old Django pattern is replaced as follows:

- `{% video %}` becomes a structured `video` content block with an approved provider/code contract.
- `{% audio %}` becomes a structured `audio` content block with an approved code or source contract.
- `{% render_field %}` becomes a structured `field` input block with an explicit `name`, `label`, `fieldType`, `required`, `choices`, and optional `branch`.
- Branch-specific instructions become block metadata, not conditional template code.
- Any unsupported template tag, inline script, iframe HTML, form HTML, or raw style must be rejected or migrated into a new structured block type through a future ADR/task/validation chain.

## Intent Preservation Chain

- Vision: Marathon remains a production learning platform where participants progress through scheduled assignments, submit reports, and see outcomes safely across all active language marathons.
- Goal Impact: Unified rendering prevents one language/page from drifting, keeps assignment submission and peer report behavior consistent, and protects launch readiness for the verified 13 active marathons and 377 current steps.
- System: `SYS-001` owns the Marathon platform behavior; `SUB-003` owns assignment submission and progress behavior.
- Feature: `FEAT-001` remains the baseline verified launch-ready catalog, VIP, and assignment flow.
- Task: `TASK-MAR-070` defines the implementation contract and validation expectations.
- Execution Plan: TASK-MAR-070 decomposes the work into contract docs, backend contract enforcement, shared renderer extraction, read-only catalog auditing, and final runtime validation.
- Coding Prompt: Worker prompts split ownership across docs, auditor, frontend renderer, and integration-owner backend contract alignment.
- Code: Implemented through `src/steps/assignment-contract.ts`, `src/answers/answers.service.ts`, `src/submissions/submissions.service.ts`, `frontend/src/components/StepAssignmentRenderer.tsx`, `frontend/src/components/assignment/*`, and `scripts/check-assignment-contract.js`.
- Validation: `VAL-TASK-MAR-070` records build and diff validation; pod-level auditor validation is deployment-gated until the new script exists in `/app`.

## Consequences

- No route may introduce `dangerouslySetInnerHTML`, iframe strings, Django-template parsing, or raw HTML rendering for assignment content, participant reports, or peer reports as a shortcut around the block contract.
- A visual or interaction change to step content must be implemented once in the shared renderer/contract layer and then validated across affected routes.
- Catalog migration may keep `assignmentContent` as a plain-text fallback, but structured blocks are the only approved mechanism for media, inputs, and branch-aware behavior.
- Validation must cover all active marathons and all current steps. The current expected baseline is 13 active marathons and 377 steps; if runtime counts change, validation must report the exact observed counts and explain the delta.
- Evidence must remain sanitized: validation reports may include aggregate counts, command statuses, route names, and field names, but not full assignment text, private reports, participant rows, emails, JWTs, payment secrets, gift-code values, or raw payloads.

## Open Questions

- [UNKNOWN: final version field name for the block contract if an explicit schema version is added].
- [UNKNOWN: whether known-word/reference blocks remain a first-class block type or are normalized into text/list blocks].
- [UNKNOWN: whether existing legacy fallback `assignmentContent` is retained permanently or only during migration].

## Validation

Implementation closure requires:

- Schema/normalization validation for every block type accepted by the backend and frontend contract.
- Route validation for step task page, support step page, authenticated saved submission readback, peer answer rendering, profile progress report generation, public reviews/winner reviews, NPS surfaces, support knowledge, and readiness reporting where applicable.
- Cross-catalog validation over all 13 active marathons and all 377 current steps, or an updated explicit count with evidence if the active catalog has changed.
- Regression validation that raw HTML/template tags are not executed and unsupported tags are rejected or rendered as inert text.
