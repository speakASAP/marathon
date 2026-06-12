# VAL-TASK-MAR-026: Assignment Content Submit Guard Validation

```yaml
id: VAL-TASK-MAR-026
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-026-assignment-content-submit-guard.md
```

## Criteria

| Criterion | Result | Evidence |
|---|---|---|
| Backend build passes | Pass | Remote `npm run build` completed with `tsc -p tsconfig.build.json`. |
| Frontend build passes | Pass | Remote `npm run build:frontend` completed with Vite output for `public/assets/index-D0gQTn6F.css` and `public/assets/index-D-Wu-b3R.js`. |
| Frontend submit guard added | Pass with catalog-data limitation | Step report UI now shows `Assignment content is not configured`, disables the report textarea/button when `assignmentContent` is missing, and the deployed bundle smoke verifies these guard strings. Production has no Step rows, so there is no live missing-content step to render without mock catalog data. |
| Backend submit guard added | Pass by code inspection and build | `SubmissionsService.submit` now throws `ConflictException('Assignment content is not configured for this step')` before VIP gating or submission persistence when the step lacks `assignmentContent`. |
| Journey smoke coverage added | Pass with expected catalog gate | Deployed pod `npm run check:journey` reported `[PASS] assignment-content-submit-guard` before `[FAIL] catalog-readiness`. |
| Rendered route remains healthy | Pass with no live step data | In-app Browser validation on `/steps/smoke-step?marathonerId=smoke-participant` showed the SPA shell rendering the not-found state and no framework overlay. Current production readiness has zero Step rows, so the missing-content guard cannot be rendered against live data yet. |

## Sensitive-Data Scan

Validation records only public UI copy, build output asset names, and smoke check names. It does not include JWTs, payment keys, participant records, gift-code values, or assignment report payloads.
