#!/usr/bin/env bash
set -euo pipefail

BACKEND_ROOT="/Users/aleksandrlubimov/project/crusher-parts-backend"

if [ ! -x "${BACKEND_ROOT}/scripts/deploy-frontend.sh" ]; then
  echo "Missing backend helper script: ${BACKEND_ROOT}/scripts/deploy-frontend.sh" >&2
  exit 1
fi

exec bash "${BACKEND_ROOT}/scripts/deploy-frontend.sh"
