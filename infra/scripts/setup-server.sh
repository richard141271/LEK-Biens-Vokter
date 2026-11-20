#!/usr/bin/env bash
# Installerer Docker + nødvendige verktøy på en ny Ubuntu-server.
# Kjør på serveren: bash setup-server.sh
set -euo pipefail

echo "🔧 Oppdaterer system..."
apt-get update -y && apt-get upgrade -y

echo "🔧 Installerer nødvendige pakker..."
apt-get install -y ca-certificates curl gnupg git openssl jq ufw rsync

echo "🔧 Installerer Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "🔧 Aktiverer Docker ved oppstart..."
systemctl enable --now docker

echo "✅ Docker installert:"
docker --version
docker compose version

echo ""
echo "✅ Server klar! Nå kan du kjøre:"
echo "   cd /opt/lek-infra"
echo "   bash scripts/fetch-official.sh"
echo "   bash scripts/create-env.sh biens-staging"
echo "   bash scripts/start-all.sh biens-staging"
