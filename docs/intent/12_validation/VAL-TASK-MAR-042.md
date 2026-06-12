# VAL-TASK-MAR-042: Public Route Brand Consistency

```yaml
id: VAL-TASK-MAR-042
task: docs/intent/11_tasks/TASK-MAR-042-public-route-brand-consistency.md
status: production_verified
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run `npm run check:journey` and confirm `public-marathon-branding` passes with expanded language/static route markers.
- Deploy from a clean detached worktree.
- Confirm Kubernetes runs the deployed image tag.
- Browser-check `/en/`, `/about`, `/rules`, and `/winners` for Marathon-first route branding, no framework overlay, and no current-route console errors.

## Evidence

### Build

Command:

```bash
npm run build:frontend
```

Result: passed. Generated production assets:

- `public/assets/index-nvcCjVWt.js`
- `public/assets/index-C5SgaAG7.css`

### Deploy

Commit: `0690852` (`Extend Marathon branding across public routes`).

Deployed image:

```text
localhost:5000/marathon:0690852
```

HTTP check:

```text
GET https://marathon.alfares.cz/en/?qa=0690852 -> HTTP 200
```

### Journey Smoke

Command:

```bash
npm run check:journey
```

Relevant result:

```text
[PASS] public-marathon-branding: Public home, landing, registration, and static pages keep Marathon as the primary product brand.
[FAIL] catalog-readiness: Catalog readiness is not complete; journey verification cannot proceed.
```

All frontend/read-only checks before catalog readiness passed. The remaining failure is expected until approved Marathon/Product/Gift/Step catalog rows are loaded.

### Browser QA

Routes checked:

- `https://marathon.alfares.cz/en/?qa=0690852-browser`
- `https://marathon.alfares.cz/about?qa=0690852-browser`
- `https://marathon.alfares.cz/rules?qa=0690852-browser`
- `https://marathon.alfares.cz/winners?qa=0690852-browser`

Evidence:

- `/en/`: title `English Marathon — registration status`; visible header leads with `MARATHON`, provider context `BY SPEAKASAP`; old `SpeakASAP Marathon` marker absent.
- `/about`: title `О Marathon — языковые марафоны SpeakASAP®`; heading `О Marathon`; old SpeakASAP-first heading absent.
- `/rules`: title `Правила Marathon — языковые марафоны SpeakASAP®`; heading `Правила Marathon`; old SpeakASAP-first heading absent.
- `/winners`: title `Финалисты Marathon — языковые марафоны SpeakASAP®`; heading `Финалисты Marathon`; old SpeakASAP-first heading absent.
- No framework overlay on checked routes.
- Timestamped log check after loading `https://marathon.alfares.cz/en/?qa=0690852-logcheck` produced no warnings/errors. Browser log buffer still contained two historical `/en/` JSON parse errors from earlier asset hashes, but no current-route errors after the current build loaded.

Screenshots:

- `/private/tmp/marathon-landing-en-0690852.png`
- `/private/tmp/marathon-about-0690852.png`
- `/private/tmp/marathon-rules-0690852.png`
- `/private/tmp/marathon-winners-0690852.png`

## Result

Passed for TASK-MAR-042. Public route branding is Marathon-first across the checked registration-funnel and informational pages. The full launch journey remains gated by missing approved catalog rows.
