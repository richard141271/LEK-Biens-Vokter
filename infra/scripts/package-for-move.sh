#!/usr/bin/env bash
# Pakker HELE infrastrukturen flyttbar (konfig, hemmeligheter, data, storage, edge functions).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
PKG="$ROOT/lek-infra-full_$STAMP.tar.gz"

echo "🛑 Stopper alle miljøer for konsistent kopi ..."
bash "$ROOT/scripts/stop-all.sh" all || true

echo "📦 Pakker ..."
tar czf "$PKG" -C "$ROOT" \
  .supabase-version scripts overrides edge-functions source envs

echo "✅ Flytte-pakke: $PKG"
echo "   På ny server:"
echo "     tar xzf $(basename "$PKG") -C /opt/lek-infra"
echo "     cd /opt/lek-infra && bash scripts/start-all.sh"
