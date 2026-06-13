# TASK-MAR-055: Publish Legacy Catalog Handoff Steps

```yaml
id: TASK-MAR-055
status: in_progress
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: partial
upstream:
  - docs/intent/11_tasks/TASK-MAR-053-legacy-catalog-audit.md
  - docs/intent/11_tasks/TASK-MAR-054-legacy-catalog-draft.md
```

## Objective

Make the newly verified legacy audit and draft commands part of the public catalog handoff runbook so source owners and operators have one safe sequence from legacy fixture discovery to approved launch catalog dry run.

## Scope

- Update the catalog import runbook with legacy audit and draft steps before approved JSON dry run.
- Update the public source-owner approval checklist with legacy audit/draft review items.
- Keep public text free of gift-code values, participant data, JWTs, payment secrets, raw fixture payloads, and assignment text.
- Extend journey smoke coverage so the public checklist continues to expose the safe legacy handoff commands.

## Non-Goals

- Do not expose operator-only support commands in the participant support page.
- Do not import or apply catalog data.
- Do not generate source-owner approval.

## Acceptance Criteria

- [ ] Public checklist includes `npm run audit:legacy-catalog`.
- [ ] Public checklist includes `npm run draft:legacy-catalog`.
- [ ] Catalog import docs explain that legacy audit/draft evidence is not approval.
- [ ] `npm run check:journey` protects the public checklist markers before the known catalog-readiness blocker.
- [ ] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-055.md`.

## Current Blocker

The production journey still requires source-owner approved catalog JSON and live mutating verification after catalog load.
