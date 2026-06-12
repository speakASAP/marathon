# VAL-TASK-MAR-041: Public Marathon Branding

```yaml
id: VAL-TASK-MAR-041
task: docs/intent/11_tasks/TASK-MAR-041-public-marathon-branding.md
status: production_verified
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run `npm run check:journey` and confirm `public-marathon-branding` passes.
- Deploy from a clean detached worktree.
- Confirm Kubernetes runs the deployed image tag.
- Browser-check `/` and `/register` for Marathon-first brand markers, no framework overlay, and no current-route console errors.

## Evidence

### Build

Command:

```bash
npm run build:frontend
```

Result: passed. Generated production assets:

- `public/assets/index-BJ98G2KN.js`
- `public/assets/index-DkIFMj0s.css`

### Deploy

Commit: `f9fe3c6` (`Make public shell Marathon-first`).

Deployed image:

```text
localhost:5000/marathon:f9fe3c6
```

HTTP check:

```text
GET https://marathon.alfares.cz/?qa=f9fe3c6 -> HTTP 200
```

### Journey Smoke

Command:

```bash
npm run check:journey
```

Relevant result:

```text
[PASS] public-marathon-branding: Public home and registration surfaces keep Marathon as the primary product brand.
[FAIL] catalog-readiness: Catalog readiness is not complete; journey verification cannot proceed.
```

All frontend/read-only checks before catalog readiness passed. The remaining failure is expected until approved Marathon/Product/Gift/Step catalog rows are loaded.

### Browser QA

Browser route: `https://marathon.alfares.cz/?qa=f9fe3c6-browser`.

Root page evidence:

- Title: `Marathon — языковые марафоны SpeakASAP®`.
- Marathon hero marker present: `Marathon: языковая практика до результата`.
- Provider context present: `by SpeakASAP®`.
- Old SpeakASAP-first hero marker absent.
- No framework overlay.
- No current-route console warnings/errors.

Interaction evidence:

- Clicked `Статус регистрации`.
- Browser navigated to `https://marathon.alfares.cz/register`.

Register page evidence:

- Title: `Регистрация на марафон — Marathon`.
- Closed-catalog registration state visible.
- Missing launch gates visible.
- No framework overlay.
- No current-route console warnings/errors.

Screenshots:

- `/private/tmp/marathon-brand-root-f9fe3c6.png`
- `/private/tmp/marathon-brand-register-f9fe3c6.png`

## Result

Passed for TASK-MAR-041. Public shell and registration entry now present Marathon as the primary product brand in production. The full launch journey remains gated by missing approved catalog rows.
