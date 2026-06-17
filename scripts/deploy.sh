#!/usr/bin/env bash
# ============================================================
#  BUPEK Finance — VPS Deployment Script
#  Run this on your Ubuntu 22.04 server as root to set up
#  the BUPEK Finance system for production.
#
#  Usage: bash scripts/deploy.sh
# ============================================================

set -euo pipefail

APP_DIR="/opt/bupek-finance"
APP_USER="bupek"

log()   { echo -e "\033[1;34m[DEPLOY]\033[0m $*"; }
ok()    { echo -e "\033[32m[  OK  ]\033[0m $*"; }
warn()  { echo -e "\033[33m[ WARN ]\033[0m $*"; }
err()   { echo -e "\033[31m[ERROR ]\033[0m $*"; exit 1; }

log "BUPEK Finance Deployment Starting..."
echo ""

# ── 1. Update system ─────────────────────────────────────────
log "Step 1: Update system packages"
apt-get update -qq && apt-get upgrade -y -qq
ok "System updated"

# ── 2. Install Node.js 20 ────────────────────────────────────
log "Step 2: Install Node.js 20"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node --version && npm --version
ok "Node.js installed: $(node -v)"

# ── 3. Install PostgreSQL ────────────────────────────────────
log "Step 3: Install PostgreSQL"
if ! command -v psql &>/dev/null; then
  apt-get install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
fi
ok "PostgreSQL installed"

# ── 4. Install PM2 ──────────────────────────────────────────
log "Step 4: Install PM2 (process manager)"
npm install -g pm2 2>/dev/null
ok "PM2 installed: $(pm2 --version)"

# ── 5. Install Nginx ─────────────────────────────────────────
log "Step 5: Install Nginx (reverse proxy)"
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
fi
ok "Nginx installed"

# ── 6. Create app user ───────────────────────────────────────
log "Step 6: Create app user '$APP_USER'"
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
fi
ok "User '$APP_USER' ready"

# ── 7. Setup PostgreSQL database ─────────────────────────────
log "Step 7: Setup PostgreSQL database"
DB_PASS=$(openssl rand -base64 24 | tr -d '=+/' | head -c 20)
sudo -u postgres psql -c "CREATE USER bupek WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE bupek_finance OWNER bupek;" 2>/dev/null || true
ok "Database created. DB password: $DB_PASS"
echo "  ⚠  Save this password: $DB_PASS"

# ── 8. Deploy app ────────────────────────────────────────────
log "Step 8: Deploy application"
mkdir -p "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
ok "App directory: $APP_DIR"

# ── 9. Build backend ─────────────────────────────────────────
log "Step 9: Build backend"
cd "$APP_DIR/backend"
npm ci --production=false
npm run build
ok "Backend built"

# ── 10. Run database migrations ──────────────────────────────
log "Step 10: Run database migrations"
cd "$APP_DIR/backend"
npm run db:migrate
ok "Migrations applied"

# ── 11. Build frontend ───────────────────────────────────────
log "Step 11: Build frontend"
cd "$APP_DIR/frontend"
npm ci
npm run build
ok "Frontend built"

# ── 12. Start with PM2 ──────────────────────────────────────
log "Step 12: Start services with PM2"
cd "$APP_DIR"

pm2 start ecosystem.config.js --env production 2>/dev/null || \
pm2 start backend/dist/server.js --name "bupek-api" --cwd "$APP_DIR/backend"

pm2 start "npm start" --name "bupek-frontend" --cwd "$APP_DIR/frontend"
pm2 save
pm2 startup | tail -1 | bash
ok "PM2 services started"

# ── 13. Setup backup cron ────────────────────────────────────
log "Step 13: Setup backup cron"
bash "$APP_DIR/scripts/setup_backup_cron.sh"
ok "Daily backup scheduled at 02:00"

echo ""
log "=========================================================="
log "✔ BUPEK Finance deployed successfully!"
log ""
log "  Backend API  : http://localhost:5000/api/v1"
log "  Frontend     : http://localhost:3000"
log "  DB Password  : $DB_PASS  (save this!)"
log ""
log "Next steps:"
log "  1. Configure Nginx to serve on your domain (see DEPLOYMENT_GUIDE.html)"
log "  2. Install SSL with: certbot --nginx -d yourdomain.com"
log "  3. Update backend/.env with production credentials"
log "  4. Configure Africa's Talking API key for SMS"
log "=========================================================="
