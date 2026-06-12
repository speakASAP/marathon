# VAL-TASK-MAR-031: Post-Load Journey Verification Runbook Validation

```yaml
id: VAL-TASK-MAR-031
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-031-post-load-verification-runbook.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pass | Remote `npm run build:frontend` succeeded and emitted `public/assets/index-DKvqxEA-.css` plus `public/assets/index-DkLNhPJl.js`. |
| Backend build or verifier syntax passes | Pass | Remote `node --check scripts/check-marathon-journey.js` and `npm run build` succeeded. |
| Smoke coverage added | Pass | Deployed pod `npm run check:journey` reported `[PASS] post-load-verification-ui` before expected `[FAIL] catalog-readiness`; mutating checks remained skipped because catalog readiness is false. |
| Support page shows post-load verification | Pass | Browser validation of `https://marathon.alfares.cz/support` showed title `Поддержка — Marathon`, `Post-load journey verification`, and placeholder-only commands for read-only, registration, checkout, gift, saved assignment readback, and assignment submission. Screenshot: `/private/tmp/marathon-post-load-verification-7c64986.png`. |
| Sensitive data excluded | Pass | Evidence records only public runbook copy, placeholder tokens, build asset names, pod/image identifiers, route title, and smoke names. |

## Sensitive-Data Scan

Validation records intentionally exclude JWTs, payment keys, participant records, gift-code values, private review text, and assignment report payloads. The support runbook uses placeholders only: `<portal-jwt>`, `<approved-smoke-gift-code>`, `<participant-id>`, and `<step-id>`.

## Deployment Evidence

- Source commit deployed: `7c64986` (`Add post-load journey checklist`).
- Production image after rollout: `localhost:5000/marathon:7c64986`.
- Production health check: `https://marathon.alfares.cz/health` returned HTTP 200.
- Current catalog readiness remains intentionally false until approved catalog-only Marathon/Product/Gift/Step data is loaded.
- The Readiness API link is present on `/support` with href `/api/v1/marathons/readiness`; browser automation did not open a new tab from the target-blank link, so this validation records DOM href presence only.
