#!/usr/bin/env sh
set -eu

NAMESPACE="${MARATHON_K8S_NAMESPACE:-statex-apps}"
LABEL_SELECTOR="${MARATHON_K8S_LABEL:-app=marathon}"
POD_PATH="${MARATHON_CATALOG_POD_PATH:-/tmp/marathon-catalog.json}"

usage() {
  cat <<'EOF'
Usage:
  scripts/load-catalog-in-pod.sh <catalog.json> [--apply] [--allow-incomplete] [--approval-packet]

Copies a human-approved catalog JSON file into the running Marathon pod,
runs the catalog loader there, then removes the staged pod copy.

Environment overrides:
  MARATHON_K8S_NAMESPACE    Kubernetes namespace, default statex-apps
  MARATHON_K8S_LABEL        Pod label selector, default app=marathon
  MARATHON_CATALOG_POD_PATH Pod staging path, default /tmp/marathon-catalog.json
EOF
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

if [ "$#" -lt 1 ]; then
  usage >&2
  exit 1
fi

CATALOG_FILE="$1"
shift

if [ ! -r "$CATALOG_FILE" ]; then
  echo "Catalog file is not readable: $CATALOG_FILE" >&2
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    --apply|--allow-incomplete|--approval-packet) ;;
    *)
      echo "Unsupported option: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

POD_NAME="$(kubectl -n "$NAMESPACE" get pods -l "$LABEL_SELECTOR" \
  -o jsonpath='{range .items[?(@.status.phase=="Running")]}{.metadata.name}{"\n"}{end}' \
  | sed -n '1p')"

if [ -z "$POD_NAME" ]; then
  echo "No running Marathon pod found in namespace $NAMESPACE with selector $LABEL_SELECTOR" >&2
  exit 1
fi

cleanup() {
  kubectl -n "$NAMESPACE" exec "$POD_NAME" -- rm -f "$POD_PATH" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "Staging approved catalog into pod $POD_NAME:$POD_PATH"
kubectl -n "$NAMESPACE" cp "$CATALOG_FILE" "$POD_NAME:$POD_PATH"

echo "Running Marathon catalog loader in pod $POD_NAME"
kubectl -n "$NAMESPACE" exec "$POD_NAME" -- npm run load:catalog -- "$POD_PATH" "$@"
