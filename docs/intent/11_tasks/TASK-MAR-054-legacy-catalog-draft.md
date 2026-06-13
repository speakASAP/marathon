# TASK-MAR-054: Generate Safe Legacy Catalog Drafts

```yaml
id: TASK-MAR-054
status: verified
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/11_tasks/TASK-MAR-053-legacy-catalog-audit.md
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
```

## Objective

Provide a safe source-owner handoff step after the legacy catalog audit: generate an intentionally incomplete catalog-only JSON draft from legacy Marathon/Step structure so an owner can fill the missing launch fields without importing user progress.

## Scope

- Add a read-only draft generator for legacy Django `marathon.marathon` and `marathon.step` fixtures.
- Map only catalog structure: marathon title/slug/language proposal and step title/order/trial/form metadata.
- Leave every `assignmentContent` blank.
- Emit no products and no gift codes.
- Set every generated marathon `active: false` to prevent accidental launch readiness.
- Support optional selection by legacy marathon primary key.

## Non-Goals

- Do not import or apply the generated draft.
- Do not generate assignment content, product prices, gift codes, participants, submissions, payments, winners, or reviews.
- Do not record raw course titles or step text in validation docs.
- Do not weaken the approved catalog loader or readiness gates.

## Acceptance Criteria

- [x] `npm run draft:legacy-catalog -- --fixture <path> --output <path>` creates a catalog-only JSON draft.
- [x] Generated drafts contain zero active marathons, zero products, zero gifts, and zero steps with assignment content.
- [x] Existing `npm run load:catalog -- <draft>` rejects the draft before approval.
- [x] `node --check scripts/draft-legacy-marathon-catalog.js` passes.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-054.md`.

## Current Blocker

The generated draft still requires source-owner selection, approved assignment content, VIP product price/currency, gift-code inventory, and explicit activation before production catalog dry-run/apply can proceed.
