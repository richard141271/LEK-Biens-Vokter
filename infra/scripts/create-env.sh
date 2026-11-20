#!/usr/bin/env bash
# Oppretter ett fullstendig isolert miljø: kopi av offisiell stack + genererte hemmeligheter.
# Bruk: create-env.sh <biens-staging|biens-prod|varroa-staging|varroa-prod>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/_lib.sh"

ENV_NAME="${1:?Bruk: create-env.sh <miljø>}"
SRC="$ROOT/source"
OUT="$(env_dir "$ENV_NAME")"

[ -d "$SRC" ] || { echo "❌ Kjør fetch-official.sh først"; exit 1; }
[ -d "$OUT" ] && { echo "⚠️  $OUT finnes. Slett den for å gjøre på nytt."; exit 1; }

# Porter, prosjektnavn og domene per miljø (fullstendig adskillelse)
case "$ENV_NAME" in
  biens-staging)  GW=8000; PG=5432; TX=6543; DOMAIN=api-staging.lekbie.no ;;
  biens-prod)     GW=8100; PG=5433; TX=6544; DOMAIN=api.lekbie.no ;;
  varroa-staging) GW=8200; PG=5434; TX=6545; DOMAIN=varroa-api-staging.lekbie.no ;;
  varroa-prod)    GW=8300; PG=5435; TX=6546; DOMAIN=varroa-api.lekbie.no ;;
  *) echo "❌ Ukjent miljø: $ENV_NAME"; exit 1 ;;
esac

echo "📦 Kopierer offisiell stack til $OUT ..."
mkdir -p "$OUT"
cp -R "$SRC/." "$OUT/"
[ -f "$SRC/.env.example" ] && cp "$SRC/.env.example" "$OUT/.env"
[ -f "$ROOT/.supabase-version" ] && cp "$ROOT/.supabase-version" "$OUT/.supabase-version"

# Generer hemmeligheter med OFFISIELLE utilities hvis tilgjengelig
cd "$OUT"
if [ -f utils/generate-keys.sh ]; then
  echo "🔐 Genererer nøkler (offisiell util)..."
  sh utils/generate-keys.sh --update-env 2>/dev/null || echo "⚠️  generate-keys.sh gikk i feil, fortsetter..."
fi
if [ -f utils/add-new-auth-keys.sh ]; then
  echo "🔐 Genererer asymmetriske auth-nøkler (offisiell util)..."
  sh utils/add-new-auth-keys.sh --update-env 2>/dev/null || echo "⚠️  add-new-auth-keys.sh gikk i feil, fortsetter..."
fi

# Hvis de offisielle utilene ikke finnes, generer vi manuelt
ensure_jwt() {
  if ! grep -q '^JWT_SECRET=' .env || grep -q '^JWT_SECRET=your-super-secret' .env; then
    local secret
    secret="$(openssl rand -base64 48 | tr -d '\n')"
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$secret|" .env
    rm -f .env.bak
    echo "🔐 JWT_SECRET generert"
  fi
  if ! grep -q '^ANON_KEY=' .env || grep -q '^ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0' .env; then
    # hent jwt_secret
    local secret
    secret="$(grep -E '^JWT_SECRET=' .env | cut -d= -f2-)"
    # hvis ikke funnet, generer ny
    [ -z "$secret" ] && { secret="$(openssl rand -base64 48 | tr -d '\n')"; sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$secret|" .env; rm -f .env.bak; }
    local header payload sig
    header="$(printf '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')"
    payload="$(printf '{"role":"anon","iss":"supabase","iat":%s,"exp":2082758400}' "$(date +%s)" | base64 | tr -d '=' | tr '/+' '_-')"
    sig="$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -hmac "$secret" -binary | base64 | tr -d '=' | tr '/+' '_-')"
    sed -i.bak "s|^ANON_KEY=.*|ANON_KEY=${header}.${payload}.${sig}|" .env
    rm -f .env.bak
    echo "🔐 ANON_KEY generert"
  fi
  if ! grep -q '^SERVICE_ROLE_KEY=' .env || grep -q '^SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ' .env; then
    local secret
    secret="$(grep -E '^JWT_SECRET=' .env | cut -d= -f2-)"
    local header payload sig
    header="$(printf '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')"
    payload="$(printf '{"role":"service_role","iss":"supabase","iat":%s,"exp":2082758400}' "$(date +%s)" | base64 | tr -d '=' | tr '/+' '_-')"
    sig="$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -hmac "$secret" -binary | base64 | tr -d '=' | tr '/+' '_-')"
    sed -i.bak "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${header}.${payload}.${sig}|" .env
    rm -f .env.bak
    echo "🔐 SERVICE_ROLE_KEY generert"
  fi
}
ensure_jwt

# Sikkerhet: erstatt alle standardpassord
sed -i.bak "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n/+=')|" .env
sed -i.bak "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=$(openssl rand -base64 24 | tr -d '\n/+=')|" .env
sed -i.bak "s|^SECRET_KEY_BASE=.*|SECRET_KEY_BASE=$(openssl rand -base64 48 | tr -d '\n')|" .env
sed -i.bak "s|^REALTIME_DB_ENC_KEY=.*|REALTIME_DB_ENC_KEY=$(openssl rand -hex 8)|" .env
sed -i.bak "s|^VAULT_ENC_KEY=.*|VAULT_ENC_KEY=$(openssl rand -hex 16)|" .env
sed -i.bak "s|^PG_META_CRYPTO_KEY=.*|PG_META_CRYPTO_KEY=$(openssl rand -base64 32 | tr -d '\n/+=')|" .env
rm -f .env.bak

# Sett miljøspesifikke verdier (siste verdi vinner i .env)
set_env() {
  local key="$1" val="$2"
  sed -i.bak -e "/^${key}=/d" .env && rm -f .env.bak || true
  printf '%s=%s\n' "$key" "$val" >> .env
}

set_env COMPOSE_PROJECT_NAME "lek-$ENV_NAME"
set_env API_GW_HTTP_PORT "$GW"
set_env KONG_HTTP_PORT "$GW"
set_env POSTGRES_PORT "$PG"
set_env POOLER_PROXY_PORT_TRANSACTION "$TX"
set_env SUPABASE_PUBLIC_URL "https://$DOMAIN"
set_env API_EXTERNAL_URL "https://$DOMAIN/auth/v1"
set_env SITE_URL "https://$DOMAIN"
set_env PROXY_DOMAIN "$DOMAIN"
set_env POOLER_TENANT_ID "lek-$ENV_NAME"
set_env STORAGE_TENANT_ID "lek-$ENV_NAME"
set_env GLOBAL_S3_BUCKET "lek-$ENV_NAME"
set_env REGION "eu-north-1"

if [[ "$ENV_NAME" == "biens-staging" ]]; then
  set_env COMPOSE_FILE "docker-compose.yml:../../overrides/biens-staging-proxy.yml"
fi

# VarroaScan: legg inn edge functions + Roboflow-hemmeligheter
if [[ "$ENV_NAME" == varroa-* ]]; then
  if [ -d "$ROOT/edge-functions" ] && [ -n "$(ls -A "$ROOT/edge-functions" 2>/dev/null)" ]; then
    mkdir -p "$OUT/volumes/functions"
    cp -R "$ROOT/edge-functions/." "$OUT/volumes/functions/"
  else
    echo "⚠️  edge-functions/ er tom. Kopier VarroaScan-funksjonene dit før oppstart."
  fi
  if [ -f "$ROOT/overrides/varroa-functions.yml" ]; then
    cp "$ROOT/overrides/varroa-functions.yml" "$OUT/varroa-functions.yml"
    set_env COMPOSE_FILE "docker-compose.yml:varroa-functions.yml"
  fi
fi

chmod 600 .env
echo ""
echo "✅ Miljø '$ENV_NAME' klart i $OUT"
echo "   ➜ Rediger $OUT/.env for SMTP og (varroa) ROBOFLOW_*"
echo "   ➜ Start med: bash scripts/start-all.sh $ENV_NAME"
