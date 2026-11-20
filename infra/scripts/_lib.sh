#!/usr/bin/env bash
set -euo pipefail

INFRA_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALL_ENVS=(biens-staging biens-prod varroa-staging varroa-prod)

env_dir() { echo "$INFRA_ROOT/envs/$1"; }

require_env() {
  local e="$1"
  [ -d "$(env_dir "$e")" ] || { echo "❌ Miljø '$e' finnes ikke. Kjør: scripts/create-env.sh $e"; exit 1; }
}

compose() {
  local e="$1"; shift
  ( cd "$(env_dir "$e")" && docker compose "$@" )
}

project_name() {
  grep -E '^COMPOSE_PROJECT_NAME=' "$(env_dir "$1")/.env" | cut -d= -f2
}
