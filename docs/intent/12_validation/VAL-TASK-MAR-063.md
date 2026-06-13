# VAL-TASK-MAR-063: Root Landing Production Journey

```yaml
id: VAL-TASK-MAR-063
task: docs/intent/11_tasks/TASK-MAR-063-root-landing-production-journey.md
status: passed
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
- Commit `f354d9d` rebuilt the root landing and added TASK-MAR-063 intent artifacts.
- Commit `43cadbf` polished the root landing header, updated the journey verifier for the rebuilt Home contract, rebuilt public assets, and was pushed to `main`.
- `./scripts/deploy.sh` completed successfully for image `localhost:5000/marathon:43cadbf`.
- Post-deploy readiness passed in Kubernetes: 13 active marathons, 377/377 steps with assignment content, 13 products, 17 gifts / 13 unused gifts, and payment runtime configuration present.
- Deployment status after rollout: image `localhost:5000/marathon:43cadbf`, one ready/available/updated pod.
- `npm run check:journey -- --base-url https://marathon.alfares.cz` passed in read-only mode.
- Rendered screenshot QA used Playwright fallback because the in-app Browser tool was unavailable in this session. Screenshots:
  - `/private/tmp/marathon-qa/home-desktop-1440-final.png`
  - `/private/tmp/marathon-qa/home-mobile-390-final.png`
- Screenshot checks: root Home title is `Marathon by SpeakASAP — start your language marathon`, H1 is `Start your language marathon today`, `.home-launch-nav` is present, legacy `.main-header` is absent on `/`, 8 language chips render, and desktop/mobile horizontal overflow is false.

## Fidelity Notes

- Concept reference: `/Users/Sergej.Stasok/.codex/generated_images/019ebaa6-18fd-7cb0-9edc-75a0a58339f6/ig_0dbccad67f8e49da016a2d2711315481948516f2677ceb9c89.png`.
- Implementation keeps the concept structure: white product header, navy/coral/green palette, large direct H1, primary Start CTA, profile CTA, language rail, register/practice/VIP/finish workflow, and proof section.
- Intentional deviation: the hero visual is code-native phone/notebook UI instead of a raster desk photograph, so production avoids shipping generated image text artifacts while preserving the concept's product signal.

## Sensitive Data Review

Validation must not include JWTs, webhook keys, checkout URLs, gift codes, full participant IDs, emails, private reports, or survey comments.
