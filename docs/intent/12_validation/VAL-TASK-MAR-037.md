# VAL-TASK-MAR-037: Rendered Route QA Runbook Validation

```yaml
id: VAL-TASK-MAR-037
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/11_tasks/TASK-MAR-037-rendered-route-qa-runbook.md
```

## Summary

Validation report for adding rendered-route QA guidance to `/support` and protecting it in journey smoke.

## Criteria Checked

| Criterion | Result | Evidence |
|---|---|---|
| Support checklist renders | Pass | Browser QA on `/support?qa=rendered-0a3c0d5-checklist` reported `hasChecklist=true` and screenshot `/private/tmp/marathon-rendered-checklist-0a3c0d5.png`. |
| Route coverage is explicit | Pass | Browser QA reported `hasHome=true`, `hasLanguage=true`, `hasRegister=true`, `hasGift=true`, `hasProfile=true`, `hasStep=true`, and `hasStepPattern=true`. |
| Smoke coverage added | Pass with expected catalog gate | In-pod `npm run check:journey` reported `[PASS] rendered-route-qa-ui` before expected `[FAIL] catalog-readiness`. |
| Catalog blocker preserved | Pass | Readiness still reports zero active marathons, products, gifts, steps, and assignment content; mutating journey checks remain skipped by default. |
| Sensitive-data hygiene | Pass | Evidence records public route paths, check names, screenshots of public/guarded states, and aggregate readiness status only. No JWTs, gift-code values, participant private data, payment secrets, or assignment reports are recorded. |

## Gate Evidence

- `npm run build:frontend` passed and emitted `public/assets/index-D0HvVxum.js` and `public/assets/index-yAlXD8lx.css`.
- Production deployment succeeded with image `localhost:5000/marathon:0a3c0d5`.
- `curl -I https://marathon.alfares.cz/health` returned HTTP 200.
- `kubectl -n statex-apps exec deploy/marathon -- npm run check:journey` passed catalog-independent checks through `nps-survey-ui`, including `rendered-route-qa-ui`, then stopped at expected `catalog-readiness`.
- Browser validation:
  - `/support?qa=rendered-0a3c0d5-checklist`: checklist, all six route targets, and `/steps/<step-id>?marathonerId=<participant-id>` were present; no framework overlay.
  - `/?qa=rendered-0a3c0d5`: closed-catalog registration copy, missing launch gates, and finalist empty state rendered.
  - `/en/?qa=rendered-0a3c0d5-language`: title `English Marathon — registration status`; no course preview, launch blockers, no sample workflow, and no fake `€29` price rendered.
  - `/register?qa=rendered-0a3c0d5`: closed-registration panel and missing launch gates rendered.
  - `/gift?qa=rendered-0a3c0d5`: gift readiness panel and launch blockers rendered.
  - `/profile?qa=rendered-0a3c0d5`: login-required profile state rendered.
  - `/steps/smoke-step?marathonerId=smoke-participant&qa=rendered-0a3c0d5`: step not-found guard rendered.
  - Stale shared-browser console entries from old `/en/` asset URLs were ignored; the current checked route content had no framework overlay.

## Recommendation

Keep route-level Browser QA as a required operator step until a committed browser runner exists. Final launch remains blocked by approved catalog rows and mutating journey inputs.
