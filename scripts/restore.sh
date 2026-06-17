#!/usr/bin/env bash
# ============================================================
#  BUPEK Finance Limited — PostgreSQL Restore Script
#
#  Usage:  bash scripts/restore.sh /path/to/bupek_backup_20260617_080000.sql.gz
#
#  WARNING: This will DROP and recreate the bupek_finance database.
#           All current data will be lost. Only run this for disaster recovery.
# ============================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────
DB_NAME="${BUPEK_DB_NAME:-bupek_finance}"
DB_USER="${BUPEK_DB_USER:-postgres}"
DB_HOST="${BUPEK_DB_HOST:-localhost}"
DB_PORT="${BUPEK_DB_PORT:-4000}"
DB_PASS="${BUPEK_DB_PASS:-8844}"

BACKUP_FILE="${1:-}"

# ── Validate input ──────────────────────────────────────────
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: bash restore.sh <backup_file.sql.gz>"
  echo "Example: bash restore.sh /var/backups/bupek/bupek_backup_20260617_080000.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

echo "=========================================="
echo " BUPEK Finance — Database Restore"
echo "=========================================="
echo " Backup file : $BACKUP_FILE"
echo " Target DB   : $DB_NAME @ $DB_HOST:$DB_PORT"
echo ""
echo " ⚠  WARNING: This will DESTROY all current data in '$DB_NAME'."
read -rp "  Type 'RESTORE' to confirm: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 0
fi

export PGPASSWORD="$DB_PASS"

echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dropping existing database..."
psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';" postgres
psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  -c "DROP DATABASE IF EXISTS ${DB_NAME};" postgres
psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" postgres

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring from backup..."
gunzip -c "$BACKUP_FILE" | psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    "$DB_NAME"

unset PGPASSWORD

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✔ Restore complete. Database '$DB_NAME' is ready."
echo ""
echo "NEXT STEPS:"
echo "  1. Start the backend:  cd backend && npm run start"
echo "  2. Run Prisma client regeneration if needed:  npm run db:generate"
echo "  3. Verify the system at http://localhost:3000"
