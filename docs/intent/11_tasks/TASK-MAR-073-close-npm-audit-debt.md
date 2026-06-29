# TASK-MAR-073: Close npm Audit Debt

## Objective

Remove the remaining npm audit vulnerabilities reported by the Marathon root package and frontend package.

## Problem

After the progression repair deploy, dependency validation still reported audit debt:

- Frontend: `6` vulnerabilities (`1` low, `4` moderate, `1` high).
- Root/runtime: `10` vulnerabilities (`6` moderate, `4` high).

## Scope

Allowed files:

- `package.json`
- `package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `public/index.html`
- `public/assets/*`
- `docs/intent/11_tasks/TASK-MAR-073-close-npm-audit-debt.md`
- `docs/intent/12_validation/VAL-TASK-MAR-073-close-npm-audit-debt.md`

Forbidden files:

- Application behavior changes unrelated to dependency compatibility.
- Database migrations.
- Participant data mutation scripts.
- Payment, registration, progression, or assignment contract changes.

## Requirements

- Root `npm audit --audit-level=low` must return `found 0 vulnerabilities`.
- Frontend `npm audit --audit-level=low` must return `found 0 vulnerabilities`.
- Backend TypeScript build must pass.
- Frontend production build must pass and publish current assets under `public/`.
- Deploy a new image from a committed source state.

## Dependency Decisions

- Upgrade Nest packages from 10.x to patched 11.x.
- Upgrade `@nestjs/serve-static` from 4.x to 5.x.
- Add a root npm override for `multer@2.2.0` because `@nestjs/platform-express@11.1.27` still depends on `multer@2.1.1`, while the advisory is fixed in `2.2.0`.
- Upgrade frontend Vite from 5.x to 7.x and `@vitejs/plugin-react` from 4.x to 5.x.
- Upgrade `react-router-dom` within major 6 to `6.30.4`, avoiding a React Router 7 migration.
- Let `npm audit fix` refresh vulnerable transitive frontend `@babel/core` and `postcss`.

## Intent Preservation Chain

- Vision: Marathon remains a secure, maintainable production learning platform.
- Goal Impact: Closing audit debt removes known dependency vulnerabilities from the deployed service and build toolchain.
- System: `SYS-001-marathon-platform`.
- Feature: Operational dependency security.
- Task: `TASK-MAR-073-close-npm-audit-debt`.
- Execution Plan: Targeted dependency upgrades, clean audit, build, deploy, and post-deploy smoke checks.
- Coding Prompt: Do not change application behavior; only update dependencies and generated frontend assets required by the build.
- Code: package manifests, lockfiles, and generated public assets.
- Validation: `VAL-TASK-MAR-073-close-npm-audit-debt`.
