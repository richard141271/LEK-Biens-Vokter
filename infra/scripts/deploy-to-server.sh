#!/usr/bin/env bash
# Laster opp LEK-infrastruktur til en server.
# Bruk: scripts/deploy-to-server.sh <server-ip> [bruker]
# Eksempel: scripts/deploy-to-server.sh 123.123.123.123 root
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_IP="${1:?Bruk: deploy-to-server.sh <server-ip>}"
SERVER_USER="${2:-root}"
SSH_KEY="${SSH_KEY:-${HOME}/.ssh/lek_infra}"

echo "📤 Laster opp infra/ til ${SERVER_USER}@${SERVER_IP}:/opt/lek-infra ..."

SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

ssh $SSH_OPTS "${SERVER_USER}@${SERVER_IP}" \
  "mkdir -p /opt/lek-infra && chown ${SERVER_USER} /opt/lek-infra"

rsync -avz --progress -e "ssh $SSH_OPTS" \
  --exclude 'envs/' \
  --exclude 'backups/' \
  --exclude 'source/' \
  --exclude 'edge-functions/' \
  --exclude '*.tar.gz' \
  --exclude '*.dump' \
  "$ROOT/" "${SERVER_USER}@${SERVER_IP}:/opt/lek-infra/"

echo ""
echo "✅ Klart! Logg inn på serveren:"
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo ""
echo "Deretter, på serveren:"
echo "   cd /opt/lek-infra"
echo "   bash scripts/fetch-official.sh"
echo "   bash scripts/create-env.sh biens-staging"
echo "   bash scripts/start-all.sh biens-staging"
