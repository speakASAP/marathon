# VAL-TASK-MAR-018: VIP Checkout Redirect Validation

```yaml
id: VAL-TASK-MAR-018
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-018-vip-checkout-redirect-validation.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Backend build passes | Pending | [MISSING: `npm run build` evidence.] |
| Frontend build passes | Pending | [MISSING: `npm run build:frontend` evidence.] |
| Journey smoke covers checkout redirect and return states | Pending | [MISSING: `npm run check:journey` evidence.] |
| VIP checkout redirect validation renders | Pending | [MISSING: Browser QA evidence.] |
| Payment return states render | Pending | [MISSING: Browser QA evidence.] |
| Deployment passes | Pending | [MISSING: deployed image evidence.] |

## Sensitive-Data Scan

Validation must reference only public/profile UI copy, masked checkout metadata, and aggregate readiness status. Do not include JWTs, payment API keys, full provider payloads, full checkout URLs with sensitive query strings, gift codes, or participant private reports.
