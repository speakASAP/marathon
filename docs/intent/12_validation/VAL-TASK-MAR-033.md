# VAL-TASK-MAR-033: Closed-Catalog Landing Real-Data Posture Validation

```yaml
id: VAL-TASK-MAR-033
status: pending
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-033-closed-catalog-landing-real-data.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pending | Remote `npm run build:frontend` passed before deploy; record final asset names after commit. |
| Backend build or verifier syntax passes | Pending | Remote `node --check scripts/check-marathon-journey.js` and `npm run build` passed before deploy; rerun or cite final commit evidence after deploy. |
| Fake closed-catalog markers removed | Pending | Verify source and built bundle omit `€29`, `Day 12`, `Speak about your weekend`, `A sample run from the Marathon`, and default workflow constants. |
| Smoke coverage added | Pending | Run deployed pod `npm run check:journey` and confirm `[PASS] landing-closed-catalog-real-data-ui` appears before expected `[FAIL] catalog-readiness`. |
| Browser validation passes | Pending | Validate deployed `/en/` shows readiness-only landing content and no fake course/price/progress markers. |
| Sensitive data excluded | Pending | Confirm validation records only public UI copy, build output, route title, deployment identifiers, and smoke names. |

## Sensitive-Data Scan

Pending final validation. Evidence must not include JWTs, payment keys, participant records, gift-code values, private review text, or assignment report payloads.
