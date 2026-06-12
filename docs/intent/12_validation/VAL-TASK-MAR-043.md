# VAL-TASK-MAR-043: Closed-Catalog Pricing Gate

```yaml
id: VAL-TASK-MAR-043
task: docs/intent/11_tasks/TASK-MAR-043-closed-catalog-pricing-gate.md
status: production_verified
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run `npm run check:journey` and confirm closed-catalog landing pricing checks pass.
- Deploy from a clean detached worktree.
- Confirm Kubernetes runs the deployed image tag.
- Browser-check `/en/#pricing` for readiness gate copy, no fallback plan offer markers, no framework overlay, and no current-route console errors.

## Evidence

### Build

Command:

```bash
npm run build:frontend
```

Result: passed. Generated production assets:

- `public/assets/index-BWLD7NxW.js`
- `public/assets/index-CqV-Tb1C.css`

### Deploy

Commit: `ca125b7` (`Gate closed-catalog landing pricing`).

Deployed image:

```text
localhost:5000/marathon:ca125b7
```

HTTP check:

```text
GET https://marathon.alfares.cz/en/?qa=ca125b7 -> HTTP 200
```

### Journey Smoke

Command:

```bash
npm run check:journey
```

Relevant result:

```text
[PASS] landing-closed-catalog-real-data-ui: Language landing removes invented closed-catalog course, progress, and price markers.
[FAIL] catalog-readiness: Catalog readiness is not complete; journey verification cannot proceed.
```

All frontend/read-only checks before catalog readiness passed. The remaining failure is expected until approved Marathon/Product/Gift/Step catalog rows are loaded.

### Browser QA

Route: `https://marathon.alfares.cz/en/?qa=ca125b7-browser#pricing`.

Evidence:

- Title: `English Marathon — registration status`.
- Pricing heading visible: `Pricing opens after catalog approval`.
- Closed-catalog panel visible: `No public offer is shown before approval`.
- Readiness counts visible: active marathons, approved steps, VIP products, gift codes.
- Forbidden fallback offer markers absent from the DOM snapshot: `€0`, `Everything in Free`, `Most complete`.
- No framework overlay.
- No current-route console warnings/errors after the page loaded.

Screenshots:

- `/private/tmp/marathon-pricing-gate-ca125b7.png`
- `/private/tmp/marathon-pricing-gate-section-ca125b7.png`

## Result

Passed for TASK-MAR-043. Closed-catalog language landing pricing now shows readiness-only launch gates instead of fallback plan offers. The full launch journey remains gated by missing approved catalog rows.
