# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 (Phase D) for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.
#
# Note: post_deploy_production_smoke below exercises real registration/
# payment/assignment flows (gated on PAYMENT_WEBHOOK_API_KEY being present).
# Set SKIP_MUTATING_SMOKE=true when invoking the runner to skip it -- do that
# for any exploratory/validation run; only leave it unset (matching the real
# script's own default) for an actual production deploy.

SERVICE_NAME="marathon"
PORT="3000"

IMAGES=(
  "marathon|.||"
)

DEPLOYMENTS=(
  "marathon|app|marathon"
)

deploy_preflight() {
  python3 "$PROJECT_ROOT/scripts/check-marathon-hosted-auth-contract.py"
}

deploy_post_verify() {
  echo "Checking registration/payment/assignment readiness..."
  if kubectl exec "deployment/${SERVICE_NAME}" -n "$NAMESPACE" -- sh -lc 'cd /app && npm run check:readiness'; then
    echo "OK production journey readiness passed"
  else
    echo "WARN production journey readiness is not complete yet (often just catalog data awaiting approval)."
  fi

  if [ "${SKIP_MUTATING_SMOKE:-false}" = "true" ]; then
    echo "Skipping public user-flow smoke because SKIP_MUTATING_SMOKE=true."
  else
    echo "Checking public user flows..."
    kubectl exec "deployment/${SERVICE_NAME}" -n "$NAMESPACE" -- sh -lc \
      'cd /app && MARATHON_BASE_URL="${MARATHON_INTERNAL_BASE_URL:-http://127.0.0.1:3000}" npm run check:user-flows'
  fi

  if [ "${SKIP_MUTATING_SMOKE:-false}" = "true" ]; then
    echo "Skipping production smoke because SKIP_MUTATING_SMOKE=true."
  else
    echo "Checking production registration/payment/assignment smoke..."
    if kubectl exec "deployment/${SERVICE_NAME}" -n "$NAMESPACE" -- sh -lc 'test -n "$PAYMENT_WEBHOOK_API_KEY" && cd /app && npm run check:production-smoke'; then
      echo "OK production registration/payment/assignment smoke passed"
    else
      echo "WARN production mutating smoke did not run or did not pass. Run manually once payment webhook credentials and approved catalog data are available."
    fi
  fi
}
