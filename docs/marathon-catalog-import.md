# Marathon Catalog Import

Use this path only for human-approved catalog data. It loads the rows needed to open registration, VIP checkout/gift redemption, and assignment submission without importing user progress.

## Allowed Data

The catalog file may contain only:

- `marathons`: required; one or more `Marathon` rows
- `steps`: required either top-level or nested under a marathon; approved `MarathonStep` rows
- `products`: required for every active launch marathon; `MarathonProduct` rows for VIP checkout
- `gifts`: required for every active launch marathon; `MarathonGift` codes for gift redemption

The loader rejects user/progress keys such as `marathoners`, `participants`, `answers`, `submissions`, `stepSubmissions`, `penaltyReports`, `users`, and `winners`.

Legacy full-export loaders are intentionally disabled. Do not use `scripts/load-marathon-export.js` or `scripts/load_marathon_export.py` for launch data; historical exports include participant progress and winner data.

Default validation is launch-ready validation. For every active marathon, the catalog must include at least one trial step, at least one non-trial gated step, one VIP product, and one gift code. Use `--allow-incomplete` only for staged non-launch imports that must not open registration yet.

## Contract

Use these artifacts when asking a source owner to prepare launch data:

- Shape-only example: `docs/examples/marathon-catalog.example.json`
- JSON Schema: `docs/schemas/marathon-catalog.schema.json`
- Source-owner approval checklist: `docs/marathon-catalog-approval-checklist.md`

The schema and loader allow either nested rows under each marathon or top-level `steps`, `products`, and `gifts` with `marathonSlug`. The loader remains authoritative because it also checks cross-row references, duplicate slugs, duplicate gift codes, active-launch readiness, and unsafe progress keys.

Human approval must confirm:

- Every active marathon has the intended `languageCode`, `title`, `slug`, and launch state.
- Every active marathon has at least one trial step and one gated non-trial step.
- Every step has approved plain-text `assignmentContent`.
- Every active marathon has exactly one VIP product with approved price and currency.
- Every active marathon has approved gift codes; do not paste full code inventories into validation reports.
- The file contains no participants, users, answers, submissions, winners, payment attempts, JWTs, or secrets.

## Runbook

1. Place the approved JSON file on the alfares server.
2. Validate without writing from the Marathon repository:

```bash
npm run load:catalog:pod -- /path/to/marathon-catalog.json
```

The helper copies the approved JSON into the running Marathon pod, runs the existing loader there, and removes the pod copy afterward. This keeps database access in the runtime context and avoids leaving gift-code inventories in `/tmp`.

Dry-run output includes `launchChecklist.marathons[]`, which reports one redacted checklist row per marathon:

- `active`, `languageCode`, `slug`, `title`
- step counts, including `trialSteps` and `gatedSteps`
- VIP product count
- gift-code count only, never gift-code values
- `assignmentContentReady`, `launchReady`, and `missing`

Generate a redacted approval packet for source-owner sign-off:

```bash
npm run load:catalog:pod -- /path/to/marathon-catalog.json --approval-packet
```

The approval packet is Markdown and is safe for validation notes because it prints only launch readiness, product title/price/currency, assignment-content readiness, and gift-code counts. It never prints gift-code values, participant records, JWTs, payment keys, assignment reports, or assignment text.

For a staged non-launch import only:

```bash
npm run load:catalog:pod -- /path/to/marathon-catalog.json --allow-incomplete
```

3. Apply only after human approval and a passing launch-ready dry run:

```bash
npm run load:catalog:pod -- /path/to/marathon-catalog.json --apply
```

The script is create-only. It aborts if a target marathon slug or gift code already exists, so it does not overwrite existing approved course rows.

4. Run the read-only production preflight from the Marathon runtime:

```bash
kubectl exec -n statex-apps deploy/marathon -- sh -lc 'cd /app && npm run check:readiness'
```

The preflight must pass before the production journey can be considered ready for registration, VIP checkout, gift redemption, and assignment submission verification.

5. Run the HTTP-level journey smoke verifier:

```bash
npm run check:journey -- --base-url https://marathon.alfares.cz
```

This verifier is read-only by default. Mutating-only flags such as `--checkout`, `--gift-code`, and `--submit` fail unless `--mutating` is present. To create a real smoke participant or verify authenticated checkout/gift/submission paths, pass `--mutating` plus the required explicit inputs:

```bash
npm run check:journey -- --auth-token '<jwt>' --marathoner-id '<participant-id>' --step-id '<step-id>'
```

The command above verifies that the saved assignment report endpoint is readable for an existing authenticated participant without creating registration, payment, gift, or submission data.

```bash
npm run check:journey -- --mutating --email smoke@example.com --auth-token '<jwt>' --submit
npm run check:journey -- --mutating --email smoke@example.com --auth-token '<jwt>' --gift-code '<approved-code>'
npm run check:journey -- --mutating --email smoke@example.com --auth-token '<jwt>' --checkout
```

## Minimal Fields

`Marathon` requires `languageCode`, `title`, `slug`, and `active`.

`MarathonStep` requires `title`, `sequence`, and `assignmentContent`; use only human-approved step titles, assignment instructions, sequence numbers, and `formKey` values.

`MarathonProduct` requires `title`, `price`, and `currency`.

`MarathonGift` requires `code`.

See `docs/examples/marathon-catalog.example.json` for shape only. Replace every placeholder with approved source-of-truth values before applying.
