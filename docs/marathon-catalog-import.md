# Marathon Catalog Import

Use this path only for human-approved catalog data. It loads the rows needed to open registration, VIP checkout/gift redemption, and assignment submission without importing user progress.

## Allowed Data

The catalog file may contain only:

- `marathons`: required; one or more `Marathon` rows
- `steps`: required either top-level or nested under a marathon; approved `MarathonStep` rows
- `products`: optional; `MarathonProduct` rows for VIP checkout
- `gifts`: optional; `MarathonGift` codes for gift redemption

The loader rejects user/progress keys such as `marathoners`, `participants`, `answers`, `submissions`, `stepSubmissions`, `penaltyReports`, `users`, and `winners`.

## Runbook

1. Place the approved JSON file on the Alphares server.
2. Validate without writing:

```bash
node scripts/load-marathon-catalog.js /path/to/marathon-catalog.json
```

3. Apply only after human approval:

```bash
node scripts/load-marathon-catalog.js /path/to/marathon-catalog.json --apply
```

The script is create-only. It aborts if a target marathon slug or gift code already exists, so it does not overwrite existing approved course rows.

4. Run the read-only production preflight from the Marathon runtime:

```bash
npm run check:readiness
```

The preflight must pass before the production journey can be considered ready for registration, VIP checkout, gift redemption, and assignment submission verification.

## Minimal Fields

`Marathon` requires `languageCode`, `title`, `slug`, and `active`.

`MarathonStep` requires `title` and `sequence`; use only human-approved step titles, sequence numbers, and `formKey` values.

`MarathonProduct` requires `title`, `price`, and `currency`.

`MarathonGift` requires `code`.

See `docs/examples/marathon-catalog.example.json` for shape only. Replace every placeholder with approved source-of-truth values before applying.
