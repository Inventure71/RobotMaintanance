#!/usr/bin/env bash

set -e

# Instructions:
#   docker login
#   chmod +x build-and-push.sh
#   ./build-and-push.sh
#
# Or with a custom tag:
#   TAG=v1 ./build-and-push.sh

TAG="${TAG:-latest}"

FRONTEND_IMAGE="inventure71/robot-maintenance-frontend:$TAG"
BACKEND_IMAGE="inventure71/robot-maintenance-backend:$TAG"

echo "Using tag: $TAG"
echo

docker buildx create --use --name multiarch-builder >/dev/null 2>&1 || true
docker buildx inspect --bootstrap >/dev/null

echo "Building and pushing backend image..."
docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.backend -t "$BACKEND_IMAGE" --push .

echo
echo "Building and pushing frontend image..."
docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.frontend -t "$FRONTEND_IMAGE" --push .

echo
echo "Done."
echo "Images pushed:"
echo "  $BACKEND_IMAGE"
echo "  $FRONTEND_IMAGE"