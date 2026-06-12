# VAL-TASK-MAR-010: Public Catalog Contract Artifact Validation

```yaml
id: VAL-TASK-MAR-010
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-010-public-catalog-contract-artifacts.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Public schema artifact served | Pass | 2026-06-12 `curl https://marathon.alfares.cz/catalog/marathon-catalog.schema.json` returned JSON with title `Marathon catalog-only launch data`, top-level keys `marathons/products/gifts/steps`, and required `marathons`. |
| Public example artifact served | Pass | 2026-06-12 `curl https://marathon.alfares.cz/catalog/marathon-catalog.example.json` returned JSON with one placeholder marathon and slug `approved-marathon-slug`; placeholder check confirmed `APPROVED_` values and no participant-like test email. |
| Support links render | Pass | 2026-06-12 Browser QA on `/support?qa=catalog-contract-cbba960` showed `JSON Schema`, `Example JSON`, and `Readiness API` links in the launch runbook panel. Screenshot: `/private/tmp/marathon-catalog-contract-links-cbba960.png`. |
| Builds pass | Pass | 2026-06-12 `npm run build:frontend`, `npm run build`, public artifact existence checks, JSON parse checks, and `git diff --check` passed before commit/deploy. |
| SPA fallback allows catalog JSON | Pass | 2026-06-12 deployed `localhost:5000/marathon:cbba960`; `/catalog/*.json` returned `content-type: application/json` instead of the SPA shell after the `/catalog/` fallback exclusion. |
| Journey smoke remains guarded | Pass | Deployed read-only `npm run check:journey` passed public/frontend/auth/RunLayer checks and stopped at expected `catalog-readiness`; mutating checks remained skipped. |

## Browser QA

- Environment: production `https://marathon.alfares.cz/support?qa=catalog-contract-cbba960`, in-app Browser, mobile-width viewport.
- Page identity: URL loaded and title was `Поддержка — Marathon`.
- Blank-page check: pass; operational dashboard and launch runbook rendered after analytics loaded.
- Framework overlay: pass; no Vite/React error overlay visible.
- Console health: pass; no relevant `error` or `warn` logs for the QA URL.
- Interaction proof: launch runbook panel showed schema/example/readiness links and the safe catalog command sequence.

## Sensitive-Data Scan

The public example contains placeholder values only. Validation includes no approved gift-code inventories, participant exports, JWTs, payment keys, or assignment reports.
