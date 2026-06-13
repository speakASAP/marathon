# VAL-TASK-MAR-063: Root Landing Production Journey

```yaml
id: VAL-TASK-MAR-063
task: docs/intent/11_tasks/TASK-MAR-063-root-landing-production-journey.md
status: blocked
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

- `npm run build:frontend` passed on `alfares:/home/ssf/Documents/Github/marathon`.
- `npm run build` passed on `alfares:/home/ssf/Documents/Github/marathon`.
- Commit `f354d9d` contains the root landing rebuild, TASK-MAR-063 intent artifacts, and updated Phase 1 status docs.
- `./scripts/deploy.sh` built and pushed image `localhost:5000/marathon:f354d9d`.
- Kubernetes rollout did not complete: new pods for `localhost:5000/marathon:f354d9d` stayed in `ContainerCreating` / image-pull start state and timed out before readiness.
- Deployment was returned to the last verified ready image `localhost:5000/marathon:6eb0ffb`; Kubernetes then reported rollout success with the existing ready pod.
- Production traffic stayed on the previous ready pod during the failed rollout attempt.

## Blocker

TASK-MAR-063 code is built and committed, but production deployment is blocked by a Kubernetes/container runtime image-pull/start issue for the new image tag. Resolve cluster image-pull cleanup before re-running `./scripts/deploy.sh` for `f354d9d` or a follow-up landing commit.

## Not Completed

- Production root `/` has not been verified with the new landing because the rollout was rolled back to `6eb0ffb`.
- Mobile visual verification and public journey smoke for the new landing remain pending until the new image is running.

## Sensitive Data Review

Validation must not include JWTs, webhook keys, checkout URLs, gift codes, full participant IDs, emails, private reports, or survey comments.
