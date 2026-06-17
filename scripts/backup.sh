#!/usr/bin/env bash
# ============================================================
#  BUPEK Finance Limited — PostgreSQL Backup Script
#  Performs a full pg_dump and rotates backups older than 30 days
#
#  Usage (manual):   bash scripts/backup.sh
#  Usage (cron):     See setup_backup_cron.sh
# ============================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────
DB_NAME="${BUPEK_DB_NAME:-bupek_finance}"
DB_USER="${BUPEK_DB_USER:-postgres}"
DB_HOST="${BUPEK_DB_HOST:-localhost}"
DB_PORT="${BUPEK_DB_PORT:-4000}"
DB_PASS="${BUPEK_DB_PASS:-8844}"

BACKUP_DIR="${BUPEK_BACKUP_DIR:-/var/backups/bupek}"
RETENTION_DAYS=30
LOG_FILE="${BACKUP_DIR}/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/bupek_backup_${TIMESTAMP}.sql.gz"

# ── Create backup directory ─────────────────────────────────
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=========================================="
log "BUPEK Finance Database Backup Starting"
log "  Database : $DB_NAME"
log "  Host     : $DB_HOST:$DB_PORT"
log "  Output   : $BACKUP_FILE"
log "=========================================="

# ── Run pg_dump ─────────────────────────────────────────────
export PGPASSWORD="$DB_PASS"

if pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    "$DB_NAME" \
  | gzip -9 > "$BACKUP_FILE"; then

  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  log "✔ Backup successful: $BACKUP_FILE ($SIZE)"
else
  log "✘ BACKUP FAILED — check errors above"
  exit 1
fi

unset PGPASSWORD

# ── Verify backup is not empty ──────────────────────────────
if [ ! -s "$BACKUP_FILE" ]; then
  log "✘ Backup file is empty — something went wrong"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ── Rotate old backups ──────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "bupek_backup_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
log "Rotation: deleted $DELETED backup(s) older than ${RETENTION_DAYS} days"

# ── Summary ─────────────────────────────────────────────────
TOTAL=$(find "$BACKUP_DIR" -name "bupek_backup_*.sql.gz" | wc -l)
DISK=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Total backups kept: $TOTAL  |  Backup folder size: $DISK"
log "Done."
echo ""
