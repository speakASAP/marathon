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
NAMESPACE="${NAMESPACE:-statex-apps}"
K8S_DIR="$PROJECT_ROOT/k8s"
REGISTRY="localhost:5000"
DEFAULT_TAG="$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "build-$(date -u +%Y%m%d%H%M%S)")"
IMAGE_TAG="${1:-$DEFAULT_TAG}"
IMAGE="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
IMAGE_LATEST="${REGISTRY}/${SERVICE_NAME}:latest"

preflight_cluster() {
  echo -e "${YELLOW}Preflight: cluster access...${NC}"

  if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo -e "${RED}Namespace not found: $NAMESPACE${NC}"
    exit 1
  fi

  if ! kubectl get nodes >/dev/null 2>&1; then
    echo -e "${RED}kubectl cannot reach cluster${NC}"
    exit 1
  fi

  # Image pull issues are fixed by build/push below — do not block deploy on them.
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

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Kubernetes Deployment: Marathon             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

if [ ! -d "$K8S_DIR" ]; then
  echo -e "${RED}Missing k8s directory: $K8S_DIR${NC}"
  exit 1
fi

preflight_cluster

if [ "${NODE_ENV:-}" = "production" ]; then
  echo -e "${YELLOW}Syncing git (NODE_ENV=production)...${NC}"
  cd "$PROJECT_ROOT"
  git fetch origin
  git stash || true
  git pull origin main
  git stash pop || true
fi

echo -e "${YELLOW}[1/5] Building image ${IMAGE}...${NC}"
docker build -t "$IMAGE" -t "$IMAGE_LATEST" "$PROJECT_ROOT"
echo -e "${GREEN}OK image built${NC}"

echo -e "${YELLOW}[2/5] Pushing to ${REGISTRY}...${NC}"
docker push "$IMAGE"
docker push "$IMAGE_LATEST"
echo -e "${GREEN}OK images pushed${NC}"

echo -e "${YELLOW}[3/5] Applying Kubernetes manifests...${NC}"
for manifest in configmap.yaml external-secret.yaml deployment.yaml service.yaml ingress.yaml; do
  if [ -f "$K8S_DIR/$manifest" ]; then
    kubectl apply -f "$K8S_DIR/$manifest" -n "$NAMESPACE"
  fi
done
echo -e "${GREEN}OK manifests applied${NC}"

echo -e "${YELLOW}[4/5] Setting deployment image to ${IMAGE}...${NC}"
kubectl set image "deployment/${SERVICE_NAME}" app="$IMAGE_LATEST" -n "$NAMESPACE"

echo -e "${YELLOW}[5/5] Waiting for rollout...${NC}"
if ! kubectl rollout status "deployment/${SERVICE_NAME}" -n "$NAMESPACE" --timeout=120s; then
  echo -e "${YELLOW}Rollout slow; diagnosing...${NC}"
  kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o wide || true
  TERMINATING_PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" --no-headers 2>/dev/null | awk '$3=="Terminating"{print $1}')
  if [ -n "$TERMINATING_PODS" ]; then
    for pod in $TERMINATING_PODS; do
      kubectl delete pod -n "$NAMESPACE" "$pod" --grace-period=0 --force || true
    done
  fi
  kubectl rollout status "deployment/${SERVICE_NAME}" -n "$NAMESPACE" --timeout=120s
fi
echo -e "${GREEN}OK rollout complete${NC}"

echo -e "${YELLOW}Current pods:${NC}"
kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME"

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║          ✅ Marathon Deployment successful!            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo "Image:    ${IMAGE}"
echo "Namespace: ${NAMESPACE}"
echo "Pods:     $(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} --no-headers | wc -l) running"
echo -e "${NC}"
