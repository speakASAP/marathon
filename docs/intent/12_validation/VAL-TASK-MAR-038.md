# VAL-TASK-MAR-038: Profile Empty Readiness State Validation

```yaml
id: VAL-TASK-MAR-038
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: production-verified
upstream:
  - docs/intent/11_tasks/TASK-MAR-038-profile-empty-readiness-state.md
```

## Summary

Validation report for the readiness-aware empty profile dashboard state. The implementation is deployed to production in image `localhost:5000/marathon:912ec01`.

## Criteria Checked

| Criterion | Result | Evidence |
|---|---|---|
| Empty profile closed-registration copy exists | Pass | Pod bundle `/assets/index-DA4QfQkS.js` contains `Registration is not open yet`. |
| Empty profile closed-registration actions exist | Pass | Pod bundle contains `Статус регистрации`; `Profile.tsx` renders support action while registration is closed. |
| Open-registration copy preserved | Pass | `Profile.tsx` keeps the open-registration branch: `Registration is open. After you start a marathon...`. |
| Smoke coverage added | Pass | In-pod `npm run check:journey` reports `[PASS] profile-empty-readiness-state`. |
| Sensitive-data hygiene | Pass | Evidence uses public readiness state, bundle markers, route screenshots, and aggregate catalog counts only. |

## Gate Evidence

- `npm run build:frontend` completed successfully before commit `912ec01`.
- Deployment completed successfully and rolled out image `localhost:5000/marathon:912ec01`.
- `curl -I -H 'Cache-Control: no-cache' https://marathon.alfares.cz/` returned HTTP 200.
- Production readiness remains closed: `registrationOpen:false`, `paymentReady:false`, `giftReady:false`, `assignmentReady:false`, counts all zero, missing `active-marathon`, `steps`, `gated-step`, `step-content`, `product`, and `gift`.
- In-pod `npm run check:journey` passed the new profile empty-state check and then failed only at the known `catalog-readiness` gate.
- Browser QA screenshots:
  - `/private/tmp/marathon-profile-qa-912ec01.png`
  - `/private/tmp/marathon-register-qa-912ec01.png`
  - `/private/tmp/marathon-support-click-qa-912ec01.png`

## Recommendation

Keep TASK-MAR-038 closed. The remaining production blocker is catalog-only: approved Marathon, Step, Product, and Gift rows must be loaded before mutating registration/payment/gift/assignment journeys can be verified.
