# VAL-TASK-MAR-039: Readiness Step Content Count Validation

```yaml
id: VAL-TASK-MAR-039
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: production-verified
upstream:
  - docs/intent/11_tasks/TASK-MAR-039-readiness-step-content-count.md
```

## Summary

Validation report for aligning readiness step-content counts with the launch gate. The implementation is deployed to production in image `localhost:5000/marathon:29bce12`.

## Criteria Checked

| Criterion | Result | Evidence |
|---|---|---|
| Public readiness count uses trimmed non-empty content | Pass | `/api/v1/marathons/readiness` is served by commit `29bce12`; response remains shape-compatible and reports `stepsWithContent:0` with no catalog rows. |
| Pod readiness count uses trimmed non-empty content | Pass | In-pod `npm run check:readiness -- --json` reports `steps:0` and `stepsWithContent:0`, using the updated script. |
| Build and syntax checks pass | Pass | `node --check scripts/check-marathon-readiness.js` and `npm run build` passed before deployment. |
| Production deploy succeeds | Pass | Rollout completed on `localhost:5000/marathon:29bce12`. |
| Journey smoke remains safe before catalog load | Pass with expected catalog gate | In-pod `npm run check:journey` passed all pre-catalog read-only checks and then failed at `[FAIL] catalog-readiness`; mutating checks remained skipped. |

## Gate Evidence

- Public readiness: `ready:false`, `registrationOpen:false`, `paymentReady:false`, `giftReady:false`, `assignmentReady:false`, counts all zero, missing `active-marathon`, `steps`, `gated-step`, `step-content`, `product`, and `gift`.
- Pod readiness JSON returned the same aggregate `stepsWithContent:0` count and payment environment checks passed.
- The host-side readiness command still provides the expected database-connection fallback when run outside the pod, preserving operator guidance.

## Recommendation

Keep TASK-MAR-039 closed. The remaining production blocker is still catalog-only: source-owner approved Marathon, Step, Product, and Gift rows are required before registration/payment/gift/assignment mutation verification can run.
