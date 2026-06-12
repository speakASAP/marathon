# VAL-TASK-MAR-033: Closed-Catalog Landing Real-Data Posture Validation

```yaml
id: VAL-TASK-MAR-033
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-033-closed-catalog-landing-real-data.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pass | Remote `npm run build:frontend` succeeded and emitted `public/assets/index-heAsvl8G.css` plus `public/assets/index-rmpXBK9y.js`. |
| Backend build or verifier syntax passes | Pass | Remote `node --check scripts/check-marathon-journey.js` and `npm run build` succeeded. |
| Fake closed-catalog markers removed | Pass | Source and built bundle checks omit `€29`, `Day 12`, `Speak about your weekend`, `A sample run from the Marathon`, `40%`, `30 days of daily language practice`, `20-30 focused minutes`, `first 3 days`, `DEFAULT_PRICE_EUR`, and `WORKFLOW_DAYS`. |
| Smoke coverage added | Pass | Deployed pod `npm run check:journey` reported `[PASS] landing-closed-catalog-real-data-ui` before expected `[FAIL] catalog-readiness`; mutating checks remained skipped because catalog readiness is false. |
| Browser validation passes | Pass | Browser validation of `https://marathon.alfares.cz/en/?qa=190def4` showed title `English Marathon — registration status`, readiness-only meta description, `ml-readiness-list`, launch blockers, and no forbidden markers in page text or metadata. Screenshot: `/private/tmp/marathon-landing-real-data-190def4.png`. |
| Sensitive data excluded | Pass | Evidence records only public UI copy, aggregate readiness counts, build output, route title, deployment identifiers, and smoke names. |

## Sensitive-Data Scan

Validation records intentionally exclude JWTs, payment keys, participant records, gift-code values, private review text, and assignment report payloads.

## Deployment Evidence

- Source commits deployed: `7a3d823` (`Remove fake closed-catalog landing data`) followed by `190def4` (`Tighten closed catalog landing metadata`).
- Final production image after rollout: `localhost:5000/marathon:190def4`.
- Production health check: `https://marathon.alfares.cz/health` returned HTTP 200.
- Current catalog readiness remains intentionally false until approved catalog-only Marathon/Product/Gift/Step data is loaded.
- Browser console output for the current `/en/?qa=190def4` validation had no current-page framework overlay; stale prior `/en/` console errors were ignored because they referenced old asset URLs and older tabs.
