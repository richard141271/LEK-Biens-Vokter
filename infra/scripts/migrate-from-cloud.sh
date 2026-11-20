#!/usr/bin/env bash
# Migrerer database fra Supabase Cloud inn i et lokalt miljø (staging FØRST!).
# Bruk: migrate-from-cloud.sh <miljø> <supabase-ref>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/_lib.sh"
ENV_NAME="${1:?Bruk: migrate-from-cloud.sh <miljø> <supabase-ref>}"
SUPA_REF="${2:?Bruk: migrate-from-cloud.sh <miljø> <supabase-ref>}"
require_env "$ENV_NAME"
DUMP="$ROOT/backups/cloud_${ENV_NAME}.dump"; mkdir -p "$ROOT/backups"

echo "1/3 🔽 Dumper database fra Supabase Cloud ($SUPA_REF) ..."
DB_CONTAINER="$(compose "$ENV_NAME" ps -q db)"
if [ -z "$DB_CONTAINER" ]; then
  echo "❌ Fant ikke database-containeren for '$ENV_NAME'." >&2
  exit 1
fi
PG_IMAGE="$(docker inspect "$DB_CONTAINER" --format '{{.Config.Image}}')"
read -rsp "    Supabase DB-passord: " SUPA_DB_PASS; echo
PGPASSWORD="$SUPA_DB_PASS" docker run --rm --network host \
  -e PGPASSWORD --entrypoint pg_dump "$PG_IMAGE" \
  -h "db.${SUPA_REF}.supabase.co" -U postgres -d postgres \
  -Fc --no-owner --no-acl > "$DUMP"
unset SUPA_DB_PASS

if [ ! -s "$DUMP" ] || ! compose "$ENV_NAME" exec -T db pg_restore --list < "$DUMP" >/dev/null; then
  echo "❌ Database-dumpen er tom eller ugyldig. Lokal database ble ikke overskrevet." >&2
  exit 1
fi

echo "2/3 🚀 Sørger for at lokalt miljø kjører ..."
compose "$ENV_NAME" up -d --wait

echo "3/3 🔄 Restore database ..."
compose "$ENV_NAME" exec -T db pg_restore -U supabase_admin -d postgres \
  --clean --if-exists --no-owner --exit-on-error < "$DUMP"

cat <<'NOTE'

✅ Database migrert (auth.users + passord-hasher, RLS, policies, storage-metadata).
📁 Storage-FILER kopieres separat:
   supabase --project-ref <ref> storage cp --recursive \
     supabase://<bucket> ./cloud-storage/<bucket>/
   ...og lastes opp til det lokale miljøet via app/API.
🔐 Bytt først når test er OK: NEXT_PUBLIC_SUPABASE_URL i appens .env.local.
NOTE
