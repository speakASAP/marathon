# VAL-TASK-MAR-057: Full Migration Quarantine Validation

```yaml
id: VAL-TASK-MAR-057
task: docs/intent/11_tasks/TASK-MAR-057-full-migration-quarantine.md
status: verified
created: 2026-06-13
last_updated: 2026-06-13
environment: alfares
```

## Validation Plan

- Confirm the local untracked full migration filename exists only outside tracked source.
- Confirm `.gitignore` excludes the exact filename.
- Confirm ADR and import runbook reject full migration experiments as launch commands.
- Confirm only tracked guardrail files are staged and committed.
- Confirm no participant rows, answer payloads, gift-code values, JWTs, payment secrets, or raw fixture payloads are recorded.

## Evidence

- `scripts/migrate-legacy-marathon-full.js` exists in the Alphares working tree as an untracked local file and was not edited.
- Read-only inspection showed the local file can parse with `node --check`, accepts `--apply`, uses Prisma `createMany`, and contains participant/submission/winner migration paths; no row payloads, gift-code values, JWTs, payment secrets, or assignment text were recorded in this validation note.
- `.gitignore` now excludes the exact filename `scripts/migrate-legacy-marathon-full.js`.
- `git status --short --ignored scripts/migrate-legacy-marathon-full.js` reports the local file as ignored (`!!`), not staged.
- `git check-ignore -v scripts/migrate-legacy-marathon-full.js` reports the `.gitignore` rule for that exact path.
- ADR-002 now states that local or experimental full-migration scripts, including `scripts/migrate-legacy-marathon-full.js`, are not part of the accepted launch path and require a replacement ADR/source-owner migration plan before production use.
- `docs/marathon-catalog-import.md` now instructs operators not to use local full-migration experiments for launch.
- `git diff --check` passed for the tracked guardrail changes.

## Result

Passed for TASK-MAR-057. The local full legacy migration experiment remains untouched, ignored, and explicitly outside the approved Marathon launch path.

The production journey remains blocked by missing approved catalog JSON, not by participant/progress migration.
