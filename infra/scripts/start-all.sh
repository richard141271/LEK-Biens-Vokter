#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/_lib.sh"
TARGET="${1:-all}"

start_one() {
  require_env "$1"
  echo "🚀 Starter $1 ($(project_name "$1"))..."
  compose "$1" up -d --wait
}

if [ "$TARGET" = "all" ]; then
  for e in "${ALL_ENVS[@]}"; do start_one "$e"; done
else
  start_one "$TARGET"
fi
echo "✅ Ferdig."
