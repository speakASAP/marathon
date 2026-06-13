# VAL-TASK-MAR-056: Catalog Draft Review Validation

```yaml
id: VAL-TASK-MAR-056
task: docs/intent/11_tasks/TASK-MAR-056-catalog-draft-review.md
status: production_verified
created: 2026-06-13
last_updated: 2026-06-13
environment: alfares
```

## Validation Plan

- Run `node --check scripts/review-marathon-catalog-draft.js`.
- Generate a legacy draft under `/tmp` and review it.
- Review a minimal complete catalog fixture and confirm gift-code values are not printed.
- Confirm public checklist source/static copies include `npm run review:catalog-draft`.
- Run `npm run check:journey` before and after deployment.
- Confirm no validation artifact records assignment text, gift-code values, participant data, JWTs, payment secrets, or raw fixture payloads.

## Evidence

- `node --check scripts/review-marathon-catalog-draft.js` passed on Alphares.
- `node --check scripts/check-marathon-journey.js` passed on Alphares.
- `npm run draft:legacy-catalog -- --fixture /home/ssf/.cursor/worktrees/speakasap-portal/aiy/portal/fixtures/marathon.json --output /tmp/marathon-legacy-catalog-draft.json` generated the legacy draft.
- `npm run review:catalog-draft -- /tmp/marathon-legacy-catalog-draft.json` printed a redacted Markdown review with `activeMarathons=0`, `steps=319`, `stepsWithAssignmentContent=0`, `products=0`, `gifts=0`, and `Ready for approval dry run: no`.
- JSON review of `/tmp/marathon-legacy-catalog-draft.json` reported `missingAssignmentContent=319`, `trialSteps=55`, `gatedSteps=264`, `unsupportedTopLevelKeys=0`, and `dangerousTopLevelKeys=0`.
- JSON review of `docs/examples/marathon-catalog.example.json` reported `okForApprovalDryRun=true`, `activeLaunchReady=1`, `stepsWithAssignmentContent=2`, `products=1`, and `gifts=1` without printing gift-code values.
- Source, frontend-public, and built-public approval checklist copies include `npm run review:catalog-draft`.
- Pre-deploy `npm run check:journey` failed at the new checklist marker as expected because production still served the previous static checklist.
- Deployed commit `4d2d923` to production image `localhost:5000/marathon:4d2d923`.
- Deploy completed successfully. The deploy readiness phase still reported `activeMarathons=0`, `products=0`, `gifts=0`, `steps=0`, and `stepsWithContent=0`, so launch remains catalog-blocked.
- Production checklist fetch returned HTTP 200 with `text/markdown; charset=UTF-8` and confirmed `npm run audit:legacy-catalog`, `npm run draft:legacy-catalog`, and `npm run review:catalog-draft` markers.
- In-pod check on `deploy/marathon` confirmed the served checklist contains the review command and `node --check scripts/review-marathon-catalog-draft.js` passes inside the runtime image.
- Post-deploy `npm run check:journey` passed `catalog-approval-checklist` plus all catalog-independent frontend/read-only assertions and failed only at the expected `catalog-readiness` gate; mutating checks remained skipped.
- Sensitive-data posture passed: validation records only command names, aggregate counts, missing-field classes, deployment image, URL status/content type, and checklist marker presence. It does not include assignment text, gift-code values, participant data, JWTs, payment secrets, or raw fixture payloads.

## Result

Passed for TASK-MAR-056. Source owners can now review in-progress catalog drafts through a redacted completion check before the strict loader dry run, and production smoke protects the public checklist marker.

The production journey remains blocked until a source owner completes and approves catalog JSON, after which the existing loader dry run, approval packet, apply, readiness, and mutating journey verification can proceed.
