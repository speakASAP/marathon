# TASK-MAR-056: Review In-Progress Catalog Drafts

```yaml
id: TASK-MAR-056
status: verified
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/11_tasks/TASK-MAR-054-legacy-catalog-draft.md
  - docs/intent/11_tasks/TASK-MAR-055-public-catalog-handoff-docs.md
```

## Objective

Give source owners a redacted completion check for in-progress Marathon catalog drafts before the strict loader dry run, so they can see missing launch fields by counts without exposing assignment text or gift-code values.

## Scope

- Add `npm run review:catalog-draft -- <catalog.json>`.
- Report aggregate and per-marathon counts for active state, step readiness, assignment-content completeness, product counts, and gift-code counts.
- Report dangerous/unsupported top-level keys, duplicate slug groups, and duplicate gift-code groups without printing duplicate gift-code values.
- Update public catalog handoff docs and checklist with the review step.
- Extend journey smoke coverage for the public checklist marker.

## Non-Goals

- Do not import, mutate, or apply catalog data.
- Do not print assignment text, gift-code values, participant data, JWTs, payment secrets, or raw fixture payloads.
- Do not weaken the strict catalog loader or readiness gates.

## Acceptance Criteria

- [x] `npm run review:catalog-draft -- <draft>` prints a redacted review.
- [x] The legacy generated draft reports zero active marathons, zero products, zero gifts, and missing assignment content.
- [x] A minimal complete fixture reports approval-dry-run readiness without printing gift-code values.
- [x] Public checklist includes `npm run review:catalog-draft`.
- [x] `npm run check:journey` protects the public checklist marker before the known catalog-readiness blocker.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-056.md`.

## Current Blocker

The production journey still requires a source-owner completed catalog, strict dry run, approval packet, catalog apply, readiness pass, and mutating journey verification.
