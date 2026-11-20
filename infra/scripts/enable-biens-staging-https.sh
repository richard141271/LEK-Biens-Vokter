#!/usr/bin/env bash
# Expose only biens-staging through the official Caddy HTTPS proxy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_DIR="$ROOT/envs/biens-staging"
DOMAIN="api-staging.lekbie.no"
SERVER_IP="37.27.216.67"
APP_URL="https://lek-biens-vokter-staging.vercel.app"

if [ ! -f "$ENV_DIR/.env" ] || [ ! -f "$ENV_DIR/docker-compose.caddy.yml" ]; then
  echo "Missing biens-staging environment or official Caddy compose file." >&2
  exit 1
fi

if ! getent ahostsv4 "$DOMAIN" | awk '{ print $1 }' | grep -Fxq "$SERVER_IP"; then
  echo "DNS for $DOMAIN must point to $SERVER_IP before enabling HTTPS." >&2
  exit 1
fi

set_env() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp "$ENV_DIR/.env.XXXXXX")"
  awk -F= -v key="$key" '$1 != key' "$ENV_DIR/.env" > "$tmp"
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$ENV_DIR/.env"
}

set_env COMPOSE_FILE "docker-compose.yml:docker-compose.caddy.yml:../../overrides/biens-staging-proxy.yml"
set_env SUPABASE_PUBLIC_URL "https://$DOMAIN"
set_env API_EXTERNAL_URL "https://$DOMAIN/auth/v1"
set_env SITE_URL "$APP_URL"
set_env PROXY_DOMAIN "$DOMAIN"
set_env ADDITIONAL_REDIRECT_URLS "$APP_URL/**,http://localhost:3000/**"

ufw allow 80/tcp comment 'HTTP for staging HTTPS'
ufw allow 443/tcp comment 'HTTPS for staging API'
ufw allow 443/udp comment 'HTTP3 for staging API'

cd "$ENV_DIR"
docker compose up -d --wait

ANON_KEY="$(awk -F= '$1 == "ANON_KEY" { print substr($0, index($0, "=") + 1); exit }' .env)"
for attempt in {1..30}; do
  if curl -fsS -o /dev/null -H "apikey: $ANON_KEY" "https://$DOMAIN/auth/v1/health"; then
    echo "HTTPS staging API is healthy at https://$DOMAIN"
    exit 0
  fi
  sleep 2
done

echo "Caddy started, but the HTTPS health check did not pass yet." >&2
exit 1
