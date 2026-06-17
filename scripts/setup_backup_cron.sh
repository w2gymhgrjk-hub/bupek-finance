#!/usr/bin/env bash
# ============================================================
#  BUPEK Finance Limited — Backup Cron Setup
#  Installs a daily cron job that runs backup.sh at 02:00 AM
#  Run this ONCE on your server as root or the postgres user.
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
CRON_SCHEDULE="0 2 * * *"
LOG_FILE="/var/log/bupek_backup_cron.log"

chmod +x "$BACKUP_SCRIPT"

CRON_LINE="$CRON_SCHEDULE bash $BACKUP_SCRIPT >> $LOG_FILE 2>&1"

# Add only if not already present
( crontab -l 2>/dev/null | grep -v "bupek_backup" ; echo "$CRON_LINE" ) | crontab -

echo "✔ Cron job installed. It will run daily at 02:00 AM."
echo ""
echo "  Schedule : $CRON_SCHEDULE"
echo "  Script   : $BACKUP_SCRIPT"
echo "  Cron log : $LOG_FILE"
echo "  Backups  : /var/backups/bupek/"
echo ""
echo "To verify: run 'crontab -l' and look for the bupek_backup line."
echo "To test now: bash $BACKUP_SCRIPT"
