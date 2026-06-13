# VAL-TASK-MAR-063: Root Landing Production Journey

```yaml
id: VAL-TASK-MAR-063
task: docs/intent/11_tasks/TASK-MAR-063-root-landing-production-journey.md
status: pending
created: 2026-06-13
last_updated: 2026-06-13
```

## Validation Plan

- Run `npm run build:frontend`.
- Run `npm run build`.
- Deploy with `./scripts/deploy.sh`.
- Verify `/` renders the new landing and links to language registration/profile.
- Verify mobile viewport has no clipped hero, language rail, or proof content.
- Run `npm run check:journey -- --base-url https://marathon.alfares.cz`.

## Evidence

Pending.

## Sensitive Data Review

Validation must not include JWTs, webhook keys, checkout URLs, gift codes, full participant IDs, emails, private reports, or survey comments.
