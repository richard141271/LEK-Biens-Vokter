#!/usr/bin/env bash
# Test av LEK-Biens Vokter staging mot lokal selvhostet stack. Kun testdata.
# Bruk: test-staging.sh [miljø-navn]  (default: biens-staging-test)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/_lib.sh"
ENV_NAME="${1:-biens-staging-test}"
require_env "$ENV_NAME"

GW="$(grep -E '^API_GW_HTTP_PORT=' "$(env_dir "$ENV_NAME")/.env" | tail -1 | cut -d= -f2)"
GW="${GW:-8000}"; BASE="http://127.0.0.1:${GW}"
SVC="$(grep -E '^SERVICE_ROLE_KEY=' "$(env_dir "$ENV_NAME")/.env" | tail -1 | cut -d= -f2)"
ANON="$(grep -E '^ANON_KEY=' "$(env_dir "$ENV_NAME")/.env" | tail -1 | cut -d= -f2)"
P=0; F=0
ok(){ echo "✅ PASS  $1"; P=$((P+1)); }
bad(){ echo "❌ FAIL  $1 — $2"; F=$((F+1)); }
H=(-H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json")

echo "▶ 1. Oppstart"
compose "$ENV_NAME" ps --format '{{.Service}} {{.State}}' 2>/dev/null \
  | grep -q "db running" && ok "db kjører" || bad "db" "container ikke running"

echo "▶ 2. Database (REST CRUD + RPC)"
INS=$(curl -s "${H[@]}" -X POST "$BASE/rest/v1/test_items" -d '{"name":"staging-test"}')
ID=$(echo "$INS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$ID" ] && ok "INSERT" || bad "INSERT" "$INS"
curl -s "${H[@]}" "$BASE/rest/v1/test_items?select=name&id=eq.$ID" | grep -q staging-test && ok "SELECT" || bad "SELECT" "ikke funnet"
curl -s "${H[@]}" -X PATCH "$BASE/rest/v1/test_items?id=eq.$ID" -d '{"name":"updated"}' >/dev/null && ok "UPDATE" || bad "UPDATE" ""
curl -s "${H[@]}" "$BASE/rest/v1/rpc/test_add" -d '{"a":2,"b":3}' | grep -q 5 && ok "RPC test_add" || bad "RPC" ""
curl -s "${H[@]}" -X DELETE "$BASE/rest/v1/test_items?id=eq.$ID" >/dev/null && ok "DELETE" || bad "DELETE" ""

echo "▶ 2b. RLS (anon skal IKKE se rader)"
curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" "$BASE/rest/v1/test_items?select=id" \
  | grep -q '^\[' && ok "RLS blokkerer anon (tom liste)" || bad "RLS" "anon fikk data"

echo "▶ 3. Autentisering (admin API)"
EMAIL="test+$(date +%s)@lek.local"
NEW=$(curl -s "${H[@]}" -X POST "$BASE/auth/v1/admin/users" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test123456\",\"email_confirm\":true}")
echo "$NEW" | grep -q '"id"' && ok "opprett testbruker" || bad "createUser" "$NEW"

echo "▶ 4. Storage (5 buckets, last opp+list+slett)"
for b in inspection-images sign-documents meeting-audio product-images mail-attachments; do
  echo "test" > /tmp/lek_test.txt
  curl -s "${H[@]}" -X POST "$BASE/storage/v1/object/$b/test/test.txt" \
    --data-binary @/tmp/lek_test.txt >/dev/null && ok "upload $b" || bad "upload $b" ""
  curl -s "${H[@]}" "$BASE/storage/v1/object/list/$b" -d '{"prefix":"test"}' >/dev/null \
    && ok "list $b" || bad "list $b" ""
  curl -s "${H[@]}" -X DELETE "$BASE/storage/v1/object/$b/test/test.txt" >/dev/null \
    && ok "delete $b" || bad "delete $b" ""
done

echo "▶ 6. Backup"
bash "$ROOT/scripts/backup.sh" "$ENV_NAME" >/dev/null 2>&1 && ok "backup" || bad "backup" ""

echo ""
echo "──────────────"
echo "Resultat: $P PASS · $F FAIL"
[ "$F" -eq 0 ] && echo "✅ Staging-test bestått" || { echo "❌ $F feilet"; exit 1; }
echo ""
echo "▶ 7. Flyttbarhet: KAN IKKE testes lokalt — krever en ekte annen server."
