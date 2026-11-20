#!/usr/bin/env bash
#
# nightly-backup.sh
# ------------------------------------------------------------------
# Nattlig backup av alle Supabase-miljoer pa serveren til Storage Box
# (Hetzner, Falkenstein/Tyskland). Hver natt kl. 03:00 (se crontab).
#
# Hva som tas backup av per miljoe:
#   1. PostgreSQL database  -> pg_dump -Fc (komprimert, egnet for pg_restore)
#   2. Storage filer        -> tar.gz av volumes/storage (bildene/audio/etc)
#   3. .env-fil             -> konfigurasjon (passord, nøkler)
#
# Opprydding: behold backup-filer yngre enn 7 dager pa Storage Box.
#
# Bruk:
#   ./nightly-backup.sh              # backup alle miljoer
#   ./nightly-backup.sh biens-staging  # backup kun ett miljoe
#
# Viktig: det eksisterende skriptet backup.sh tar en FYSISK kopi av
# hele Docker-volumene (db + storage). Dette skriptet tar en LOGISK
# kopi (pg_dump) som er lettere aa gjenopprette delvis og som fungerer
# pa tvers av PostgreSQL-versjoner. Begge kan brukes side om side.
# ------------------------------------------------------------------
set -euo pipefail

# --- Innstillinger ---
INFRA_ROOT="/opt/lek-infra"
STORAGE_USER="u724883"
STORAGE_HOST="u724883.your-storagebox.de"
STORAGE_PORT="23"
STORAGE_KEY="/root/.ssh/lek_infra"
RETENTION_DAYS=7
STAMP="$(date +%Y%m%d_%H%M%S)"

ALLE_MILJOER=(biens-staging biens-prod varroa-staging varroa-prod)

# --- Hjelpefunksjoner ---
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
fail() { echo "[FEIL] $*" >&2; exit 1; }

# Finner hvilke miljoer som faktisk finnes (har en .env-fil)
finn_eksisterende_miljoer() {
  local funnet=()
  for m in "${ALLE_MILJOER[@]}"; do
    [ -f "$INFRA_ROOT/envs/$m/.env" ] && funnet+=("$m")
  done
  echo "${funnet[@]}"
}

# Tar backup av ETT miljoe
backup_av_miljoe() {
  local miljoe="$1"
  local env_dir="$INFRA_ROOT/envs/$miljoe"
  local tmp_dir="$INFRA_ROOT/backups/$STAMP/$miljoe"
  mkdir -p "$tmp_dir"

  log "Starter backup av '$miljoe'..."

  # 1. Database dump (logisk kopi)
  log "  -> Tar pg_dump..."
  ( cd "$env_dir" && docker compose exec -T db \
      pg_dump -U postgres -d postgres -Fc --no-owner --no-acl \
    ) > "$tmp_dir/db.dump" \
    || fail "pg_dump feilet for $miljoe"

  # 2. Storage filer (bilder, audio, etc)
  if [ -d "$env_dir/volumes/storage" ]; then
    log "  -> Pakker storage-filer..."
    tar czf "$tmp_dir/storage.tar.gz" -C "$env_dir/volumes" storage \
      || fail "tar av storage feilet for $miljoe"
  else
    log "  -> (ingen storage-mappe, hopper over)"
  fi

  # 3. .env (konfigurasjon - passord og nokler)
  if [ -f "$env_dir/.env" ]; then
    cp "$env_dir/.env" "$tmp_dir/.env"
    chmod 600 "$tmp_dir/.env"
  fi

  # Størrelse på backupen
  local storrelse
  storrelse="$(du -sh "$tmp_dir" | cut -f1)"
  log "  -> Ferdig: $storrelse"
}

# Sender hele dagens backup til Storage Box
send_til_storage_box() {
  local kilde="$INFRA_ROOT/backups/$STAMP"
  local maal="${STORAGE_USER}@${STORAGE_HOST}:backups/$STAMP"

  log "Sender til Storage Box (Tyskland)..."
  rsync -az --delete \
    -e "ssh -i $STORAGE_KEY -p $STORAGE_PORT -o StrictHostKeyChecking=no" \
    "$kilde/" "$maal/" \
    || fail "rsync til Storage Box feilet"
  log "  -> Sendt."
}

# Sletter backup-mapper eldre enn RETENTION_DAYS pa Storage Box.
# Mapper er navngitt YYYYMMDD_HHMMSS, slik at vi kan sammenligne datoen i navnet.
# Bruker lftp fordi Hetzner Storage Box ikke tillater 'find'/'rm' via vanlig SSH-shell.
rydd_gamle() {
  local grense
  grense="$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)"
  log "Ryddel: sletter backup eldre enn $RETENTION_DAYS dager (foer $grense)..."

  # 1. Hent liste over alle mapper i backups/
  local mapper
  mapper="$(lftp -u "$STORAGE_USER," -p "$STORAGE_PORT" \
    -e "set sftp:connect-program 'ssh -i $STORAGE_KEY -o StrictHostKeyChecking=no'; \
        cls -1 backups/; bye" \
    "sftp://$STORAGE_HOST" 2>/dev/null)"

  [ -z "$mapper" ] && { log "  -> Ingen mapper aa rydde."; return 0; }

  # 2. For hver mappe: hvis dato i navnet er eldre enn grensen -> slett
  local slettet=0
  for m in $mapper; do
    local mappe_dato="${m:0:8}"
    if [ "$mappe_dato" \< "$grense" ]; then
      log "  -> Sletter: $m"
      lftp -u "$STORAGE_USER," -p "$STORAGE_PORT" \
        -e "set sftp:connect-program 'ssh -i $STORAGE_KEY -o StrictHostKeyChecking=no'; \
            rm -r backups/$m; bye" \
        "sftp://$STORAGE_HOST" 2>/dev/null \
        || fail "Kunne ikke slette $m pa Storage Box"
      slettet=$((slettet + 1))
    fi
  done

  log "  -> Finito. Slettet $slettet mapper."
}

# --- Hovedflyt ---
main() {
  local miljoer
  if [ $# -ge 1 ]; then
    miljoer=("$1")
  else
    miljoer=($(finn_eksisterende_miljoer))
  fi

  [ ${#miljoer[@]} -eq 0 ] && fail "Ingen miljoer funnet."

  log "===== Nattlig backup $STAMP ====="
  log "Miljoer som skal backappes: ${miljoer[*]}"

  for m in "${miljoer[@]}"; do
    backup_av_miljoe "$m"
  done

  send_til_storage_box
  rydd_gamle

  # Rydd opp lokal kopi (Storage Box har den permanente kopien)
  rm -rf "$INFRA_ROOT/backups/$STAMP"

  log "===== Backup ferdig ====="
}

main "$@"
