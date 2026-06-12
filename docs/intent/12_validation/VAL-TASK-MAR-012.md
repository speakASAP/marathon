# VAL-TASK-MAR-012: Language Fallback Smoke Coverage Validation

```yaml
id: VAL-TASK-MAR-012
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-012-language-fallback-smoke-coverage.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Script syntax passes | Pass | 2026-06-12 `node --check scripts/check-marathon-journey.js` completed. |
| Language landing shell is covered | Pass | 2026-06-12 `npm run check:journey` reported `[PASS] frontend-language-fallback-shell: /en/ language landing route serves the frontend shell before catalog readiness.` |
| Empty active-marathon API response is covered | Pass | 2026-06-12 `npm run check:journey` reported `[PASS] language-marathon-api-empty-safe: No active marathon API response for en is represented as an empty HTTP 200 body.` |
| Browser hydration confirms visitor state | Pass | 2026-06-12 Browser QA on `https://marathon.alfares.cz/en/?qa=continue-audit` hydrated to `English Marathon is being prepared.` and `Registration status` instead of remaining on `Loading marathon...`. |
| Journey remains guarded | Pass | 2026-06-12 `npm run check:journey` passed the new language fallback checks, then stopped at expected `[FAIL] catalog-readiness`; mutating checks remained skipped. |

## Sensitive-Data Scan

Validation referenced only public shell routes, aggregate readiness state, and the empty active-marathon API response. No catalog content, gift-code inventories, participants, JWTs, payment keys, or assignment reports were recorded.
