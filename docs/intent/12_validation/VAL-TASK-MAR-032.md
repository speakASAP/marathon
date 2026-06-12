# VAL-TASK-MAR-032: Support Runbook Mobile Layout and Ready-State Visibility Validation

```yaml
id: VAL-TASK-MAR-032
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-032-support-runbook-mobile-layout.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pass | Remote `npm run build:frontend` succeeded and emitted `public/assets/index-Bd61Vj36.css` plus `public/assets/index-B7lv3y2m.js`. |
| Backend build or verifier syntax passes | Pass | Remote `node --check scripts/check-marathon-journey.js` and `npm run build` succeeded. |
| Smoke coverage added | Pass | Deployed pod `npm run check:journey` reported `[PASS] support-runbook-mobile-layout` before expected `[FAIL] catalog-readiness`; mutating checks remained skipped because catalog readiness is false. |
| Support runbook mobile layout renders | Pass | Browser validation of `https://marathon.alfares.cz/support?qa=f24972f` at a 319px viewport showed title `Поддержка — Marathon`, `support-runbook-command` command blocks, `pre-wrap` whitespace, `anywhere` overflow wrapping, and a 203px command block width inside a 261px verification section. Screenshot: `/private/tmp/marathon-support-runbook-mobile-f24972f.png`. |
| Post-load checklist remains outside launch gate | Pass | Source moved the checklist into `SupportPostLoadVerification`; Browser DOM confirmed `support-post-load-verification` exists and `support-launch-runbook .support-post-load-verification` does not. |
| Sensitive data excluded | Pass | Evidence records only public UI copy, placeholder tokens, class/layout markers, build asset names, deployment identifiers, route title, and smoke names. |

## Sensitive-Data Scan

Validation records intentionally exclude JWTs, payment keys, participant records, gift-code values, private review text, and assignment report payloads. The support commands continue to use placeholders only: `<portal-jwt>`, `<approved-smoke-gift-code>`, `<participant-id>`, and `<step-id>`.

## Deployment Evidence

- Source commit deployed: `f24972f` (`Improve support runbook mobile layout`).
- Production image after rollout: `localhost:5000/marathon:f24972f`.
- Production health check: `https://marathon.alfares.cz/health` returned HTTP 200.
- Current catalog readiness remains intentionally false until approved catalog-only Marathon/Product/Gift/Step data is loaded.
- Browser console output for the current `/support` validation had no current-page framework overlay; stale prior `/en/` console errors were ignored because they referenced old asset URLs and older tabs.
