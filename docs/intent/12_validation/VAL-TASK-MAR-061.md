# VAL-TASK-MAR-061: Smoke Data Isolation Validation

```yaml
id: VAL-TASK-MAR-061
status: pass
owner: Engineering
created: 2026-06-13
validated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/11_tasks/TASK-MAR-061-smoke-data-isolation.md
```

## Evidence

- Pre-coding gate: pass; implementation scoped to synthetic smoke isolation and guarded smoke tooling.
- Build: pass; `npm run build` completed before deployment.
- Deploy: pass; deployed image `localhost:5000/marathon:smoke-isolation-20260613-2` after no-cache rebuild to avoid stale image tag reuse.
- Pod code check: pass; `/app/dist/shared/smoke-filter.js` filters smoke participants by `name startsWith "Marathon Prod Smoke"` and no longer uses broad phone-prefix exclusion.
- Readiness: pass; deploy readiness reported `Marathon production readiness: ready` with 13 active marathons, 14 gifts, 13 unused gifts, 377 steps, 377 stepsWithContent.
- Read-only journey: pass; `npm run check:journey -- --base-url https://marathon.alfares.cz` completed with `Marathon journey smoke: ready` and `mutation-skipped`.
- Analytics smoke isolation: pass; production analytics returned `participants.total=53470`, `assignments.submissions=238675`, `surveys.responses=0`, `surveys.npsScore=0`, `winners.medalRows=3608`, `gifts.total=12`, `gifts.used=0`, `catalog.ready=true`.
- Public winners smoke isolation: pass; `/api/v1/winners?page=1&limit=30` returned `total=3608`, excluding the synthetic smoke winner.
- Guarded smoke runner: pass; pod exposes `smoke:production-safe`, and `node --check scripts/run-production-smoke-safe.js` passes.
- Notification safety: pass; notification store aggregate counts are `example_invalid=0`, `smoke_content=0`, `recent_marathon=0`.

## Notes

The public catalog readiness remains unfiltered and includes all gift inventory needed for launch gating. Business analytics excludes the smoke replacement gift code prefix and gift redemption by the smoke user, so gift analytics intentionally reports 12 visible unused gifts while readiness reports 14 total / 13 unused gifts.
