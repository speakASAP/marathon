#!/bin/bash
# deploy.sh — build, push to local registry, rollout marathon on K8s
# Usage: ./scripts/deploy.sh [image-tag]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE_NAME="marathon"
SKIP_MUTATING_SMOKE="${SKIP_MUTATING_SMOKE:-false}"
NAMESPACE="${NAMESPACE:-statex-apps}"
K8S_DIR="$PROJECT_ROOT/k8s"
REGISTRY="localhost:5000"
DEFAULT_TAG="$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "build-$(date -u +%Y%m%d%H%M%S)")"
IMAGE_TAG="${1:-$DEFAULT_TAG}"
IMAGE="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
IMAGE_LATEST="${REGISTRY}/${SERVICE_NAME}:latest"

DEPLOY_TIMING_LOCAL="$(dirname "$PROJECT_ROOT")/shared/scripts/load-deploy-phase-timing.sh"
DEPLOY_TIMING_HOME="$HOME/Documents/Github/shared/scripts/load-deploy-phase-timing.sh"
if [ -f "$DEPLOY_TIMING_LOCAL" ]; then
  # shellcheck disable=SC1090
  source "$DEPLOY_TIMING_LOCAL" "$PROJECT_ROOT"
elif [ -f "$DEPLOY_TIMING_HOME" ]; then
  # shellcheck disable=SC1090
  source "$DEPLOY_TIMING_HOME" "$PROJECT_ROOT"
else
  echo -e "${YELLOW}WARN deploy timing library not found; using local fallback timing.${NC}"
  deploy_timing_init() { :; }
  deploy_timing_phase_start() { echo -e "${YELLOW}$1...${NC}"; }
  deploy_timing_phase_end() { echo -e "${GREEN}OK $1${NC}"; }
  deploy_timing_run_phase() {
    local phase_name="$1"
    local phase_func="$2"
    deploy_timing_phase_start "$phase_name"
    "$phase_func"
    deploy_timing_phase_end "$phase_name"
  }
  deploy_timing_k8s_rollout_wait() {
    local kubectl_bin="$1"
    local deployment_name="$2"
    local deployment_namespace="$3"
    "$kubectl_bin" rollout status "deployment/${deployment_name}" -n "$deployment_namespace" --timeout=180s
  }
  deploy_timing_finish_success() { echo -e "${GREEN}OK $1 deployment finished${NC}"; }
fi
deploy_timing_init "$SERVICE_NAME"

preflight_cluster() {
  echo -e "${YELLOW}Preflight: hosted Auth source contract...${NC}"
  python3 "$PROJECT_ROOT/scripts/check-marathon-hosted-auth-contract.py"

  echo -e "${YELLOW}Preflight: cluster access...${NC}"

  if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo -e "${RED}Namespace not found: $NAMESPACE${NC}"
    exit 1
  fi

  if ! kubectl get nodes >/dev/null 2>&1; then
    echo -e "${RED}kubectl cannot reach cluster${NC}"
    exit 1
  fi

  BAD_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" --no-headers 2>/dev/null | awk '$3 ~ /CrashLoopBackOff|Error|CreateContainerConfigError|CreateContainerError/ {print $1}')
  if [ -n "$BAD_PODS" ]; then
    echo -e "${RED}Service has unhealthy pods (not ImagePull — fix these first):${NC}"
    kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o wide || true
    for pod in $BAD_PODS; do
      echo -e "${YELLOW}--- describe pod/$pod ---${NC}"
      kubectl describe pod -n "$NAMESPACE" "$pod" || true
    done
    exit 1
  fi

  echo -e "${GREEN}Preflight passed${NC}"
}

post_deploy_journey_readiness() {
  echo -e "${YELLOW}Checking registration/payment/assignment readiness...${NC}"

  if kubectl exec "deployment/${SERVICE_NAME}" -n "$NAMESPACE" -- sh -lc 'cd /app && npm run check:readiness'; then
    echo -e "${GREEN}OK production journey readiness passed${NC}"
    return 0
  fi

  echo -e "${YELLOW}WARN production journey readiness is not complete yet.${NC}"
  echo -e "${YELLOW}WARN Deploy remains successful because this usually means catalog data is still awaiting approval/load.${NC}"
  return 0
}

post_deploy_user_flow_smoke() {
  if [ "$SKIP_MUTATING_SMOKE" = "true" ]; then
    echo -e "${YELLOW}Skipping public user-flow smoke because SKIP_MUTATING_SMOKE=true.${NC}"
    return 0
  fi

  echo -e "${YELLOW}Checking public user flows...${NC}"

  if ! kubectl exec "deployment/${SERVICE_NAME}" -n "$NAMESPACE" -- sh -lc 'cd /app && MARATHON_BASE_URL="${MARATHON_INTERNAL_BASE_URL:-http://127.0.0.1:3000}" npm run check:user-flows'; then
    echo -e "${RED}User flow smoke failed${NC}"
    exit 1
  fi
  echo -e "${GREEN}OK public user flow smoke passed${NC}"
}

post_deploy_production_smoke() {
  if [ "$SKIP_MUTATING_SMOKE" = "true" ]; then
    echo -e "${YELLOW}Skipping production smoke because SKIP_MUTATING_SMOKE=true.${NC}"
    return 0
  fi

  echo -e "${YELLOW}Checking production registration/payment/assignment smoke...${NC}"

  if kubectl exec "deployment/${SERVICE_NAME}" -n "$NAMESPACE" -- sh -lc 'test -n "$PAYMENT_WEBHOOK_API_KEY" && cd /app && npm run check:production-smoke'; then
    echo -e "${GREEN}OK production registration/payment/assignment smoke passed${NC}"
    return 0
  fi

  echo -e "${YELLOW}WARN production mutating smoke did not run or did not pass.${NC}"
  echo -e "${YELLOW}WARN Run manually after payment webhook credentials and approved catalog data are available: npm run check:production-smoke${NC}"
  return 0
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Kubernetes Deployment: Marathon             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

if [ ! -d "$K8S_DIR" ]; then
  echo -e "${RED}Missing k8s directory: $K8S_DIR${NC}"
  exit 1
fi

deploy_timing_run_phase "Preflight" preflight_cluster

if [ "${NODE_ENV:-}" = "production" ]; then
  deploy_timing_phase_start "Git sync"
  echo -e "${YELLOW}Syncing git (NODE_ENV=production)...${NC}"
  cd "$PROJECT_ROOT"
  git fetch origin
  git stash || true
  git pull origin main
  git stash pop || true
  deploy_timing_phase_end "Git sync"
fi

deploy_timing_phase_start "Build image"
echo -e "${YELLOW}Building image ${IMAGE}...${NC}"
docker build -t "$IMAGE" -t "$IMAGE_LATEST" "$PROJECT_ROOT"
echo -e "${GREEN}OK image built${NC}"
deploy_timing_phase_end "Build image"

deploy_timing_phase_start "Push image"
echo -e "${YELLOW}Pushing to ${REGISTRY}...${NC}"
docker push "$IMAGE"
docker push "$IMAGE_LATEST"
echo -e "${GREEN}OK images pushed${NC}"
deploy_timing_phase_end "Push image"

deploy_timing_phase_start "Apply Kubernetes manifests"
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"
for manifest in configmap.yaml external-secret.yaml deployment.yaml service.yaml ingress.yaml; do
  if [ -f "$K8S_DIR/$manifest" ]; then
    kubectl apply -f "$K8S_DIR/$manifest" -n "$NAMESPACE"
  fi
done
echo -e "${GREEN}OK manifests applied${NC}"
deploy_timing_phase_end "Apply Kubernetes manifests"

deploy_timing_phase_start "Set deployment image"
echo -e "${YELLOW}Setting deployment image to ${IMAGE}...${NC}"
kubectl set image "deployment/${SERVICE_NAME}" app="$IMAGE" -n "$NAMESPACE"
deploy_timing_phase_end "Set deployment image"

deploy_timing_phase_start "Wait for rollout"
echo -e "${YELLOW}Waiting for rollout...${NC}"
deploy_timing_k8s_rollout_wait kubectl "$SERVICE_NAME" "$NAMESPACE"
echo -e "${GREEN}OK rollout complete${NC}"
deploy_timing_phase_end "Wait for rollout"

deploy_timing_phase_start "Post-deploy status"
echo -e "${YELLOW}Current pods:${NC}"
kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME"
deploy_timing_phase_end "Post-deploy status"

deploy_timing_run_phase "Journey readiness" post_deploy_journey_readiness
deploy_timing_run_phase "User flow smoke" post_deploy_user_flow_smoke
deploy_timing_run_phase "Production smoke" post_deploy_production_smoke

deploy_timing_finish_success "Marathon"
echo "Image:    ${IMAGE}"
echo "Namespace: ${NAMESPACE}"
echo "Pods:     $(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} --no-headers | wc -l) running"
DEPLOY_TIMING_FINISHED=1
exit 0
