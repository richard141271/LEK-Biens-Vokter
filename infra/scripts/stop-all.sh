#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/_lib.sh"
TARGET="${1:-all}"

stop_one() { echo "🛑 Stopper $1..."; compose "$1" down; }

if [ "$TARGET" = "all" ]; then
  for e in "${ALL_ENVS[@]}"; do stop_one "$e"; done
else
  stop_one "$TARGET"
fi
