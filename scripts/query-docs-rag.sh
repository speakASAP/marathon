#!/usr/bin/env bash
# Query docs-rag using the per-pair RS256 service token injected into the Marathon
# pod from Vault (principal svc-marathon--docs-rag, role
# internal:docs-rag-microservice:readonly).
#
# Was JWT_TOKEN, which was never actually mounted -- no ExternalSecret named it --
# so this script failed for every caller with the message below.
# The token is never printed or passed on the local shell command line.
set -euo pipefail

QUERY="${1:-}"
MAX_TOKENS="${2:-3000}"
NAMESPACE="${NAMESPACE:-statex-apps}"
DEPLOYMENT="${RAG_TOKEN_DEPLOYMENT:-marathon}"

if [ -z "$QUERY" ]; then
  echo "Usage: $0 '<query>' [maxTokens]" >&2
  exit 2
fi

kubectl -n "$NAMESPACE" exec -i "deployment/$DEPLOYMENT" -- node - "$QUERY" "$MAX_TOKENS" <<'NODE'
const [query, maxTokensRaw] = process.argv.slice(2);
const token = process.env.DOCS_RAG_SERVICE_TOKEN;
const maxTokens = Number.parseInt(maxTokensRaw || '3000', 10);
const baseUrl = process.env.DOCS_RAG_INTERNAL_URL || 'http://docs-rag-microservice.statex-apps.svc.cluster.local:3397';

if (!token) {
  console.error('DOCS_RAG_SERVICE_TOKEN is missing in the Marathon pod. Check k8s/external-secret.yaml and ExternalSecret marathon-secret.');
  process.exit(2);
}

fetch(`${baseUrl}/retrieval/agent-context`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, maxTokens: Number.isFinite(maxTokens) ? maxTokens : 3000 }),
}).then(async (response) => {
  const text = await response.text();
  process.stdout.write(text);
  if (!text.endsWith('\n')) process.stdout.write('\n');
  process.exit(response.ok ? 0 : 1);
}).catch((error) => {
  console.error(`docs-rag request failed: ${error.message}`);
  process.exit(1);
});
NODE
