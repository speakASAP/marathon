# Marathon Certificate Template

This folder preserves the canonical certificate template generated from the user-provided SpeakASAP language marathon diploma reference on 2026-06-30.

Use this template as the base for all generated participant certificates unless a later owner-approved certificate template explicitly replaces it.

## Runtime contract

The application currently loads certificate background images from:

- `public/img/certificates/gold_en.png`
- `public/img/certificates/silver_en.png`
- `public/img/certificates/bronze_en.png`

`frontend/src/pages/ProfileAwards.tsx` then draws participant-specific fields on top in canvas:

- participant name
- marathon/language line
- finish date

Keep those runtime filenames stable unless you update the frontend contract in the same change.

## Source assets

- `certificate-base-clean-from-user-reference.png` - clean certificate base, built from the user's PNG reference, with the pale watermark pattern continued across the parchment background.
- `certificate-editable-template.svg` - editable SVG overlay layout.
- `certificate-layers.json` - machine-readable coordinates for text and trophy layers.
- `overlay-fields-gold.png`, `overlay-fields-silver.png`, `overlay-fields-bronze.png` - transparent overlay examples.
- `trophy-gold-transparent.png`, `trophy-silver-transparent.png`, `trophy-bronze-transparent.png` - transparent trophy assets; gold is extracted from the user's reference.
- `make_certificate_template.py` - generator used for this asset package.

## Agent usage

When generating or modifying certificates:

1. Start from `certificate-base-clean-from-user-reference.png` or the runtime medal background.
2. Use `certificate-layers.json` for placement instead of guessing coordinates.
3. Preserve the ornate gold frame, top SpeakASAP wording, central divider, and pale continuous watermark pattern.
4. Do not replace this with a newly drawn decorative certificate unless the owner explicitly asks for a redesign.
5. If changing layer positions, update `certificate-layers.json`, `certificate-editable-template.svg`, and runtime PNGs together.

## Intent Preservation

- Vision: preserve the existing SpeakASAP language marathon diploma style.
- Goal Impact: participant certificates should look like the supplied original diploma, not a newly invented design.
- System: Marathon profile awards certificate generation.
- Feature: medal-specific certificate backgrounds and participant-specific overlay fields.
- Task: save the cleaned certificate template and layer assets in the remote repository for future agents.
- Execution Plan: store runtime PNGs under `public/img/certificates` and source assets under `docs/assets/certificate-template`.
- Coding Prompt: use the user-provided PNG-derived template as the canonical base.
- Code: runtime assets and template documentation in this repository.
- Validation: verify image dimensions and remote git status after copying.
