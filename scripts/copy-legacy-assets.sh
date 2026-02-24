#!/usr/bin/env bash
# Copy legacy marathon assets from speakasap-portal to marathon/frontend/public
# so the frontend build includes hero backgrounds, landing images, certificates.
# Run from marathon repo root when speakasap-portal is at ../speakasap-portal.
# Usage: ./scripts/copy-legacy-assets.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARATHON_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORTAL_ROOT="$(cd "$MARATHON_ROOT/../speakasap-portal" 2>/dev/null || true)"
PUBLIC="$MARATHON_ROOT/frontend/public"

PORTAL_ROOT="${PORTAL_ROOT:-$MARATHON_ROOT/../speakasap-portal}"
if [ ! -d "$PORTAL_ROOT" ]; then
  echo "speakasap-portal not found at $PORTAL_ROOT"
  echo "Clone it or set PORTAL_ROOT. Skipping asset copy."
  exit 0
fi

# Portal static: portal/static/img/bg and portal/static/img/landing
# Some setups use portal/static or speakasap_site/static
for BASE in "$PORTAL_ROOT/portal/static" "$PORTAL_ROOT/static"; do
  if [ -d "$BASE/img/bg" ]; then
    PORTAL_IMG="$BASE/img"
    break
  fi
done
if [ -z "$PORTAL_IMG" ]; then
  echo "Portal img/bg not found. Skipping asset copy."
  exit 0
fi

mkdir -p "$PUBLIC/img/bg" "$PUBLIC/img/landing" "$PUBLIC/img/certificates"

# Hero backgrounds (marathon.css uses img/bg/de.jpg etc.)
if [ -d "$PORTAL_IMG/bg" ]; then
  for f in "$PORTAL_IMG/bg"/*.jpg; do
    [ -f "$f" ] && cp "$f" "$PUBLIC/img/bg/" 2>/dev/null || true
  done
  echo "Copied img/bg (hero backgrounds)"
fi

# Landing images (circles, steps, adv, support) — portal or marathon app static
for LANDING_SRC in "$PORTAL_IMG/landing" "$PORTAL_ROOT/marathon/static/img/landing"; do
  if [ -d "$LANDING_SRC" ]; then
    cp -r "$LANDING_SRC"/* "$PUBLIC/img/landing/" 2>/dev/null || true
    echo "Copied img/landing from $LANDING_SRC"
    break
  fi
done

# Certificates (gold, silver, bronze — legacy uses in certs-view)
for name in gold silver bronze; do
  if [ -f "$PORTAL_IMG/${name}.png" ]; then
    cp "$PORTAL_IMG/${name}.png" "$PUBLIC/img/certificates/${name}_en.png"
  fi
done
[ -d "$PUBLIC/img/certificates" ] && [ -n "$(ls -A "$PUBLIC/img/certificates" 2>/dev/null)" ] && echo "Copied img/certificates"

echo "Legacy assets copied to frontend/public. Run npm run build:frontend to include them in the build."
