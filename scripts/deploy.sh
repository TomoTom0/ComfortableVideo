#!/bin/bash

# Deploy script: sync dist/ to DEPLOY_DESTINATION
set -euo pipefail

# load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC1091
  export $(grep -v '^#' .env | xargs) || true
fi

if [ -z "${DEPLOY_DESTINATION:-}" ]; then
  echo "Error: DEPLOY_DESTINATION not set in .env"
  exit 1
fi

if [ ! -d dist ]; then
  echo "Error: dist/ directory not found. Build before deploy."
  exit 1
fi

echo "Deploying dist/ to: $DEPLOY_DESTINATION"
rsync -av --delete dist/ "$DEPLOY_DESTINATION"

echo "Deploy completed."

