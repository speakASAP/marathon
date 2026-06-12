# VAL-TASK-MAR-035: Gift Readiness Loading and Nav Status Consistency Validation

```yaml
id: VAL-TASK-MAR-035
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/11_tasks/TASK-MAR-035-gift-readiness-loading-nav.md
```

## Summary

Validation report for the gift readiness loading guard and global navigation registration-status consistency.

## Criteria Checked

| Criterion | Result | Evidence |
|---|---|---|
| Gift loading state hides redemption form | Pass | Source renders `Checking gift redemption status` with gift-code entry hidden while readiness is pending; bundle smoke protects the marker. |
| Gift closed-catalog guard preserved | Pass | Browser validation on `/gift?qa=95fb2c7` rendered `Gift redemption is not ready`, `Gift launch blockers`, and no `Redeem gift code` button. |
| Nav registration status label consistent | Pass | Browser DOM reported `.nav-registration-link` text `Скоро` and href `/register`; the CTA also rendered `Скоро`. |
| Smoke coverage added | Pass with expected catalog gate | In-pod `npm run check:journey` reported `[PASS] gift-readiness-loading-state` and `[PASS] nav-readiness-error-state` before expected `[FAIL] catalog-readiness`. |
| Sensitive-data hygiene | Pass | Evidence includes route names, check names, screenshots of public closed-catalog UI, and aggregate readiness state only. No JWTs, gift-code values, participant private data, payment secrets, or assignment reports are recorded. |

## Gate Evidence

- `npm run build:frontend` passed and emitted `public/assets/index-2zovX1zD.js`.
- Production deployment succeeded with image `localhost:5000/marathon:95fb2c7`.
- `curl -I https://marathon.alfares.cz/health` returned HTTP 200.
- `kubectl -n statex-apps exec deploy/marathon -- npm run check:journey` passed catalog-independent checks through `nps-survey-ui`, including `gift-readiness-loading-state`, then stopped at expected `catalog-readiness`.
- Browser validation:
  - `/gift?qa=95fb2c7` title `Gift code — SpeakASAP Marathon`.
  - Gift page checks: `hasGiftNotReady=true`, `hasLaunchBlockers=true`, `hasRedeemButton=false`, `navRegistrationText=Скоро`, `hasOverlay=false`.
  - Mobile nav interaction clicked `.nav-registration-link` and landed on `/register` with `Регистрация пока закрыта` and `Недостающие условия запуска` visible.
  - Current `/register` page logs contained no errors or warnings.

## Recommendation

Keep the full registration/payment/gift/assignment release proof blocked until approved catalog rows and test inputs exist. Treat the gift readiness loading and nav status consistency slice as verified.
