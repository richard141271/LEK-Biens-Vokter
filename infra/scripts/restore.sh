#!/usr/bin/env bash
# Gjenoppretter et miljø. Fysisk volumrestore er primær (flyttbar på tvers av servere).
# Bruk: restore.sh <miljø> <backup-mappe>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/_lib.sh"
ENV_NAME="${1:?Bruk: restore.sh <miljø> <backup-mappe>}"
BK="${2:?Bruk: restore.sh <miljø> <backup-mappe>}"
[ -d "$BK" ] || { echo "❌ Mangler $BK"; exit 1; }

echo "⚠️  Gjenoppretter $ENV_NAME (overskriver eksisterende). Ctrl-C for å avbryte."; sleep 5

if [ ! -d "$(env_dir "$ENV_NAME")" ]; then
  echo "ℹ️  Miljøet finnes ikke. Kjører create-env.sh $ENV_NAME ..."
  bash "$ROOT/scripts/create-env.sh" "$ENV_NAME"
fi

compose "$ENV_NAME" down || true

echo "🔄 Gjenoppretter volumer (db + storage) ..."
rm -rf "$(env_dir "$ENV_NAME")/volumes"
tar xzf "$BK/volumes.tar.gz" -C "$(env_dir "$ENV_NAME")"

cp "$BK/.env" "$(env_dir "$ENV_NAME")/.env"
chmod 600 "$(env_dir "$ENV_NAME")/.env"

echo "🔄 Starter $ENV_NAME ..."
compose "$ENV_NAME" up -d --wait
echo "✅ Restore fullført for $ENV_NAME"
