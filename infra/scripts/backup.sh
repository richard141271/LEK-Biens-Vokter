#!/usr/bin/env bash
# Full backup: logisk DB-dump + fysisk volumkopi (db + storage) + konfig/hemmeligheter.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/_lib.sh"
TARGET="${1:-all}"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST_ROOT="$ROOT/backups/$STAMP"

backup_one() {
  local e="$1"; require_env "$e"
  local dir="$DEST_ROOT/$e"; mkdir -p "$dir"
  echo "📦 Backer opp $e ..."

  compose "$e" exec -T db pg_dump -U postgres -d postgres -Fc > "$dir/db.dump"
  tar czf "$dir/volumes.tar.gz" -C "$(env_dir "$e")" volumes
  cp "$(env_dir "$e")/.env" "$dir/.env"
  [ -f "$(env_dir "$e")/.supabase-version" ] && cp "$(env_dir "$e")/.supabase-version" "$dir/"
  echo "   ✅ $e -> $dir"
}

if [ "$TARGET" = "all" ]; then
  for e in "${ALL_ENVS[@]}"; do backup_one "$e"; done
else
  backup_one "$TARGET"
fi
echo "✅ Backup: $DEST_ROOT"
