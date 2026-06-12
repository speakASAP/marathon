# VAL-TASK-MAR-008: Closed-Catalog Landing Polish Validation

```yaml
id: VAL-TASK-MAR-008
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-008-closed-catalog-landing-polish.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| `/en/` no-catalog hero is honest | Pass | 2026-06-12 Browser QA on `https://marathon.alfares.cz/en/?qa=closed-polish-0b0cc6e-final` rendered `English Marathon is being prepared.` and no longer showed `Real EN language progress` or `EN language`. Screenshot: `/private/tmp/marathon-closed-landing-hero-0b0cc6e.png`. |
| Mobile nav links remain readable | Pass | Browser screenshot showed single-line landing nav links in the horizontal mobile nav; no `How it works` phrase split across lines. |
| Primary status action works | Pass | Scoped `.ml-hero` `View registration status` button click scrolled to the registration panel; DOM contained `Registration status` and `Registration is not open yet`. Screenshot: `/private/tmp/marathon-closed-landing-status-0b0cc6e.png`. |
| Frontend build passes | Pass | 2026-06-12 `npm run build:frontend` completed and generated `public/assets/index-CoI2h-Zm.css` plus `public/assets/index-LwE_Z_7Q.js`; `npm run build` also passed. |
| Registration remains closed | Pass | Deployed image `localhost:5000/marathon:0b0cc6e`; `/api/v1/marathons/readiness` remains `ready:false`, `registrationOpen:false`, with missing catalog classes unchanged. |

## Browser QA

- Environment: production `https://marathon.alfares.cz/en/`, in-app Browser, mobile-width viewport.
- Page identity: URL and title loaded as `English Marathon — 30 days of daily language practice`.
- Blank-page check: pass; hero and navigation rendered.
- Framework overlay: pass; no Vite/React error overlay visible.
- Console health: pass for the QA URL; no relevant `error` or `warn` logs recorded for `closed-polish-0b0cc6e`.
- Interaction proof: pass; hero status button scrolled to closed-registration panel.

## Sensitive-Data Scan

This task used public no-catalog pages only. Validation includes no JWTs, payment data, gift codes, participant IDs, or private assignment text.
