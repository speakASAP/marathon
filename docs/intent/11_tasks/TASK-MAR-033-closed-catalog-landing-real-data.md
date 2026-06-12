# TASK-MAR-033: Closed-Catalog Landing Real-Data Posture

```yaml
id: TASK-MAR-033
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Remove invented course, progress, and price details from language landing pages while production catalog readiness is false. The landing must stay useful and polished, but it must not imply real approved assignments, a product price, or participant progress before approved Marathon/Product/Gift/Step data exists.

## Scope

- Remove fallback VIP price rendering from the language landing.
- Replace hard-coded assignment preview and workflow sample data with readiness-only closed-catalog status.
- Keep open-registration copy focused on profile, checkout, gift, and assignment APIs without hard-coded course content.
- Add journey smoke coverage that rejects the removed fake closed-catalog markers in the built frontend bundle.

## Non-Goals

- Do not load or invent catalog data.
- Do not edit course step titles, sequences, form keys, or assignment content.
- Do not change registration, payment, gift, or assignment API behavior.
- Do not run mutating journey checks.

## Acceptance Criteria

- [x] Closed-catalog language landing does not show default VIP price, fake day number, fake progress percent, fake assignment title, or sample workflow copy.
- [x] Closed-catalog hero and preview show readiness counts and missing launch gates only.
- [x] VIP price/checkout copy does not display a numeric fallback price without an approved product value from the API.
- [x] Frontend production build succeeds.
- [x] Backend build or verifier syntax checks pass for touched verifier code.
- [x] Journey smoke reports `landing-closed-catalog-real-data-ui` before the expected catalog-readiness gate.
- [x] Browser validation confirms deployed `/en/` renders readiness-only landing content without the removed fake markers.
- [x] Deployment and validation evidence are recorded without sensitive data.

## Validation

- Remote `node --check scripts/check-marathon-journey.js` passed.
- Remote `npm run build` passed.
- Remote `npm run build:frontend` passed and emitted `public/assets/index-heAsvl8G.css` and `public/assets/index-rmpXBK9y.js`.
- Commits `7a3d823` and `190def4` implemented the landing change; final production deployment uses image `localhost:5000/marathon:190def4`.
- Production `/health` returned HTTP 200 after deployment.
- Deployed pod journey smoke reported `[PASS] landing-closed-catalog-real-data-ui` before the expected `[FAIL] catalog-readiness` gate.
- Browser validation on `https://marathon.alfares.cz/en/?qa=190def4` confirmed title `English Marathon — registration status`, readiness-only meta description, readiness list, launch blockers, and no removed fake markers in page text or metadata.
