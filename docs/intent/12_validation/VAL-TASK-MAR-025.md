# VAL-TASK-MAR-025: Registration Missing Launch Gates Validation

```yaml
id: VAL-TASK-MAR-025
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-025-registration-missing-gates.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Frontend build passes | Pass | Remote `npm run build:frontend` completed with Vite output for `public/assets/index-D0gQTn6F.css` and `public/assets/index-CJ1UulmC.js`. |
| Backend build passes | Pass | Remote `npm run build` completed with `tsc -p tsconfig.build.json`. |
| Smoke coverage added | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] register-missing-gates-ui` before `[FAIL] catalog-readiness`. |
| Closed catalog remains closed | Pass | In-app Browser validation on `/register` showed the closed panel with missing gates `Active Marathon`, `Steps`, `Gated Step`, `Step Content`, `Product`, and `Gift`; the registration language-link list was empty. |
| Rendered UI is healthy | Pass | In-app Browser reported page title `Регистрация на марафон — Marathon`, no framework overlay, and the missing-gates section visible after scroll. Console API returned stale prior `/en/` errors only, not current `/register` errors. |

## Sensitive-Data Scan

Validation records only public readiness class labels, build output asset names, and smoke check names. It does not include JWTs, payment keys, participant records, gift-code values, or assignment report payloads.
