#!/usr/bin/env bash
# Henter og låser offisiell Supabase self-hosted til ref i .supabase-version.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="$(grep -E '^ref=' "$ROOT/.supabase-version" | cut -d= -f2)"
DEST="$ROOT/source"

[ -d "$DEST/docker" ] && { echo "✅ Kilde finnes allerede ($REF). Slett source/ for å hente på nytt."; exit 0; }

echo "📥 Henter offisiell Supabase @ $REF ..."
TMP="$(mktemp -d)"
git clone --depth 1 --branch "$REF" --filter=blob:none --sparse \
  https://github.com/supabase/supabase.git "$TMP/repo"
( cd "$TMP/repo" && git sparse-checkout set docker )
mkdir -p "$DEST"
cp -R "$TMP/repo/docker/." "$DEST/"
rm -rf "$TMP"
printf '%s\n' "$REF" > "$DEST/.pinned-ref"
echo "✅ Låst kilde ligger i $DEST (@ $REF)"
