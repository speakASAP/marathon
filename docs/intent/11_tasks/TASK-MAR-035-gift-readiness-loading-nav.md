# TASK-MAR-035: Gift Readiness Loading and Nav Status Consistency

```yaml
id: TASK-MAR-035
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
validation:
  - docs/intent/12_validation/VAL-TASK-MAR-035.md
```

## Objective

Keep the gift redemption journey honest before catalog readiness is known, and make global navigation registration wording match the same readiness state as the primary CTA.

## Goal Impact

This improves the production registered-user journey without requiring approved catalog rows. Gift-code entry no longer appears during the readiness loading window, and closed-catalog visitors see consistent registration/status wording in both navigation entry points.

## Scope

- Render a neutral gift readiness loading card while `/api/v1/marathons/readiness` is pending.
- Keep the gift-code form hidden until readiness is successfully known and gift redemption is available.
- Use the readiness-aware registration label on the plain global nav registration link as well as the CTA.
- Add journey smoke coverage for the loading copy and stable nav hook.

## Non-Goals

- Do not change gift redemption API semantics.
- Do not run mutating gift-code redemption checks without approved test inputs.
- Do not change catalog readiness rules or payment behavior.

## Acceptance Criteria

- [x] `/gift` displays a readiness-loading panel instead of the redemption form while readiness is pending.
- [x] Gift closed-catalog and readiness-error guards continue to render after loading.
- [x] The global nav registration text link uses the same readiness-aware label as the CTA.
- [x] Journey smoke reports `gift-readiness-loading-state` before the expected catalog-readiness gate.
- [x] Validation records only safe route/check/status evidence.

## Validation Summary

- `npm run build:frontend` passed and emitted the production asset bundle.
- Production deployed `localhost:5000/marathon:95fb2c7`.
- In-pod read-only journey smoke reported `[PASS] gift-readiness-loading-state` and `[PASS] nav-readiness-error-state` before the expected `[FAIL] catalog-readiness` gate.
- Browser validation on `https://marathon.alfares.cz/gift?qa=95fb2c7` showed the closed-catalog gift readiness panel, no redeem button, nav text `Скоро`, and no current-page framework overlay.
- Browser interaction opened the mobile menu, clicked `.nav-registration-link`, and landed on `/register` with the closed-registration panel and missing launch gates visible.

## Sensitive-Data Classification

Low for frontend copy and route checks. Do not record gift-code values, JWTs, participant private data, payment secrets, or assignment report payloads.
