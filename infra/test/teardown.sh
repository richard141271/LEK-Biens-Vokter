#!/usr/bin/env bash
# Fjerner et testmiljø + volumer. Rører ikke andre miljøer.
# Bruk: teardown.sh <miljø-navn>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_NAME="${1:?Bruk: teardown.sh <miljø-navn>}"

if [ -d "$ROOT/envs/$ENV_NAME" ]; then
  ( cd "$ROOT/envs/$ENV_NAME" && docker compose down -v 2>/dev/null || true )
  rm -rf "$ROOT/envs/$ENV_NAME"
  echo "🧹 Testmiljøet $ENV_NAME og dets volumer er slettet."
else
  echo "ℹ️  Miljøet $ENV_NAME finnes ikke, ingen handling."
fi
