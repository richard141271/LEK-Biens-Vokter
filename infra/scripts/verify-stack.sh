#!/usr/bin/env bash
# Røyktest av alle miljøer. Kun LESE-operasjoner. Kan kjøres når som helst.
# Bruk: verify-stack.sh [miljø|all]
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/_lib.sh"
TARGET="${1:-all}"

PASS=0; FAIL=0

env_val() { grep -E "^$2=" "$(env_dir "$1")/.env" | tail -1 | cut -d= -f2-; }

default_gw() {
  case "$1" in
    biens-staging) echo 8000 ;; biens-prod) echo 8100 ;;
    varroa-staging) echo 8200 ;; varroa-prod) echo 8300 ;;
  esac
}

# check <navn> <forventet-regex> <curl-args...>
check() {
  local name="$1" expect="$2"; shift 2
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@" 2>/dev/null || echo 000)"
  if [[ "$code" =~ $expect ]]; then
    echo "  ✅ PASS  $name (HTTP $code)"; PASS=$((PASS+1))
  elif [ "$code" = "000" ]; then
    echo "  ❌ FAIL  $name — ingen svar (tjenesten kjører ikke?)"; FAIL=$((FAIL+1))
  else
    echo "  ❌ FAIL  $name — HTTP $code (forventet: $expect)"; FAIL=$((FAIL+1))
  fi
}

verify_one() {
  local e="$1"; require_env "$e"
  local gw svc anon base
  gw="$(env_val "$e" API_GW_HTTP_PORT)"; gw="${gw:-$(default_gw "$e")}"
  svc="$(env_val "$e" SERVICE_ROLE_KEY)"; svc="${svc:-$(env_val "$e" SUPABASE_SECRET_KEY)}"
  anon="$(env_val "$e" ANON_KEY)"; anon="${anon:-$(env_val "$e" SUPABASE_PUBLISHABLE_KEY)}"
  base="http://127.0.0.1:${gw}"

  echo ""
  echo "▶ Miljø: $e  ($base)"

  check "REST /rest/v1 (DB-tilkobling)" '^(200|204)$' \
    -H "apikey: $svc" -H "Authorization: Bearer $svc" "$base/rest/v1/"

  check "Auth /auth/v1/health" '^(200)$' \
    -H "apikey: $anon" "$base/auth/v1/health"

  check "Storage /storage/v1/bucket" '^(200)$' \
    -H "apikey: $svc" -H "Authorization: Bearer $svc" "$base/storage/v1/bucket"

  if [[ "$e" == varroa-* ]]; then
    check "Functions /functions/v1/varroa-infer (OPTIONS)" '^(204|200)$' \
      -X OPTIONS -H "apikey: $anon" "$base/functions/v1/varroa-infer"
  else
    echo "  ⏭  HOPP  Functions — ikke relevant for $e"
  fi
}

if [ "$TARGET" = "all" ]; then
  for e in "${ALL_ENVS[@]}"; do verify_one "$e"; done
else
  verify_one "$TARGET"
fi

echo ""
echo "──────────────────────────────"
echo "Resultat: ${PASS} PASS · ${FAIL} FAIL"
echo "──────────────────────────────"
[ "$FAIL" -eq 0 ] && echo "✅ Alle tester bestått." || { echo "❌ $FAIL test(er) feilet."; exit 1; }
