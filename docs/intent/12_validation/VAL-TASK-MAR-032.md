# VAL-TASK-MAR-032: Support Runbook Mobile Layout and Ready-State Visibility Validation

```yaml
id: VAL-TASK-MAR-032
status: pending
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-032-support-runbook-mobile-layout.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pending | Remote `npm run build:frontend` passed before deploy; record final asset names after commit. |
| Backend build or verifier syntax passes | Pending | Remote `node --check scripts/check-marathon-journey.js` and `npm run build` passed before deploy; rerun or cite final commit evidence after deploy. |
| Smoke coverage added | Pending | Run deployed pod `npm run check:journey` and confirm `[PASS] support-runbook-mobile-layout` appears before expected `[FAIL] catalog-readiness`. |
| Support runbook mobile layout renders | Pending | Validate `/support` on a narrow viewport after deployment. |
| Post-load checklist remains outside launch gate | Pending | Confirm source and rendered DOM show `support-post-load-verification` is not nested inside the closed-catalog `support-launch-runbook` block. |
| Sensitive data excluded | Pending | Confirm validation records only public UI copy, class/layout markers, build output, pod/image identifiers, route title, and smoke names. |

## Sensitive-Data Scan

Pending final validation. Evidence must not include JWTs, payment keys, participant records, gift-code values, private review text, or assignment report payloads.
