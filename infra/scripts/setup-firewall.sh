#!/usr/bin/env bash
# Grunnleggende brannmur. Kjør som root på serveren.
set -euo pipefail
apt-get update && apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp  comment 'SSH'
ufw allow 80/tcp  comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose
echo "✅ Ferdig. Studio tilgjengelig kun via SSH-tunnel: ssh -L 8000:127.0.0.1:8000 bruker@server"
