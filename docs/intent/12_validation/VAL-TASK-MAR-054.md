# VAL-TASK-MAR-054: Legacy Catalog Draft Validation

```yaml
id: VAL-TASK-MAR-054
task: docs/intent/11_tasks/TASK-MAR-054-legacy-catalog-draft.md
status: verified
created: 2026-06-13
last_updated: 2026-06-13
environment: alfares
```

## Validation Plan

- Run `node --check scripts/draft-legacy-marathon-catalog.js`.
- Generate a draft under `/tmp` from the found legacy fixture.
- Verify aggregate draft counts only.
- Verify `npm run load:catalog -- <draft>` rejects the draft because launch approval fields are still missing.
- Confirm no validation artifact records raw titles, assignment text, gift codes, participant data, JWTs, payment keys, or raw fixture payloads.

## Evidence

- `node --check scripts/draft-legacy-marathon-catalog.js` passed on Alphares.
- `npm run draft:legacy-catalog -- --fixture /home/ssf/.cursor/worktrees/speakasap-portal/aiy/portal/fixtures/marathon.json --output /tmp/marathon-legacy-catalog-draft.json` passed on Alphares.
- Draft summary reported `marathons=11`, `activeMarathons=0`, `steps=319`, `trialSteps=55`, `gatedSteps=264`, `products=0`, `gifts=0`, and `stepsWithAssignmentContent=0`.
- Aggregate JSON inspection confirmed the draft has 11 marathons, 319 steps, 0 active marathons, 0 products, 0 gifts, and 0 steps with non-empty assignment content.
- Draft shape contains catalog-only keys: marathon `active`, `coverImageUrl`, `landingVideoUrl`, `languageCode`, `rulesTemplate`, `slug`, `steps`, `title`, `vipGateDate`; step `assignmentContent`, `formKey`, `isPenalized`, `isTrialStep`, `sequence`, `socialLink`, `title`.
- `npm run load:catalog -- /tmp/marathon-legacy-catalog-draft.json` failed as intended with `steps[0].assignmentContent is required`.
- `npm run load:catalog -- /tmp/marathon-legacy-catalog-draft.json --allow-incomplete` also failed as intended with `steps[0].assignmentContent is required`.
- `npm run check:journey` passed all catalog-independent frontend/read-only assertions and failed only at the expected `catalog-readiness` gate; mutating checks remained skipped.
- Sensitive-data posture passed for the validation artifact: this report records aggregate counts, file paths, key names, and the expected validation error only. It does not include raw titles, assignment text, gift-code values, participant data, JWTs, payment keys, or raw fixture payloads.

## Result

Passed for TASK-MAR-054. A safe draft handoff exists for source-owner completion, and the existing loader rejects the generated draft until assignment content and the rest of the approved launch catalog are supplied.

The production journey remains blocked until a source owner selects launch marathons, approves language codes and activation state, adds plain-text assignment content, VIP product price/currency, and gift-code inventory, then runs the existing catalog dry run.
