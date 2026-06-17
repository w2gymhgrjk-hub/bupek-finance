#!/usr/bin/env bash
# ============================================================
#  BUPEK Finance — API Smoke Test Suite
#  Tests all critical endpoints to verify the system is working.
#  Usage: bash scripts/test_api.sh
# ============================================================

API="http://localhost:5000/api/v1"
PASS=0; FAIL=0; TOTAL=0

green()  { echo -e "\033[32m✔ $*\033[0m"; }
red()    { echo -e "\033[31m✘ $*\033[0m"; }
yellow() { echo -e "\033[33m► $*\033[0m"; }
bold()   { echo -e "\033[1m$*\033[0m"; }

check() {
  local name="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL+1))
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS+1)); green "$name (HTTP $actual)"
  else
    FAIL=$((FAIL+1)); red "$name — expected $expected, got $actual"
  fi
}

bold "=========================================================="
bold " BUPEK Finance Limited — API Smoke Tests"
bold " Target: $API"
bold "=========================================================="
echo ""

# ── Login ────────────────────────────────────────────────────
yellow "AUTH MODULE"
LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@bupekfinance.co.tz","password":"Admin@1234"}')
HTTP=$(echo "$LOGIN" | tail -1)
BODY=$(echo "$LOGIN" | head -1)
check "POST /auth/login (CEO)" "200" "$HTTP"

# Extract token
TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  red "Cannot extract access token — remaining tests will fail"
  echo "Make sure the backend is running: cd backend && npm run dev"
  exit 1
fi
green "Access token obtained"

AUTH="-H \"Authorization: Bearer $TOKEN\""

# ── Health check ──────────────────────────────────────────────
yellow ""
yellow "HEALTH"
check "GET /health" "200" "$(curl -s -o /dev/null -w "%{http_code}" "$API/../health")"

# ── Dashboard ─────────────────────────────────────────────────
yellow ""
yellow "DASHBOARD / REPORTS"
check "GET /reports/dashboard" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/reports/dashboard")"
check "GET /reports/par" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/reports/par")"
check "GET /reports/daily-collections" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/reports/daily-collections")"
check "GET /reports/branch-performance" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/reports/branch-performance")"

# ── Branches ─────────────────────────────────────────────────
yellow ""
yellow "BRANCHES"
check "GET /branches" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/branches")"

# ── Users ────────────────────────────────────────────────────
yellow ""
yellow "USERS"
check "GET /users" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/users")"

# ── Clients ──────────────────────────────────────────────────
yellow ""
yellow "CLIENTS"
check "GET /clients" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/clients")"

# ── Loans ────────────────────────────────────────────────────
yellow ""
yellow "LOANS"
check "GET /loans" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/loans")"
check "GET /loans/products" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/loans/products")"

# ── Repayments ───────────────────────────────────────────────
yellow ""
yellow "REPAYMENTS"
check "GET /repayments" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/repayments")"
check "GET /repayments/daily-summary" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/repayments/daily-summary")"

# ── Collections ──────────────────────────────────────────────
yellow ""
yellow "COLLECTIONS"
check "GET /collections/overdue" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/collections/overdue")"
check "GET /collections/arrears-report" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/collections/arrears-report")"

# ── SMS ──────────────────────────────────────────────────────
yellow ""
yellow "SMS"
check "GET /sms/templates" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/sms/templates")"
check "GET /sms/logs" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/sms/logs")"

# ── Audit ────────────────────────────────────────────────────
yellow ""
yellow "AUDIT TRAIL"
check "GET /audit" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/audit")"

# ── RBAC check: unauthorized ──────────────────────────────────
yellow ""
yellow "SECURITY (expect 401 without token)"
check "GET /clients (no token) → 401" "401" \
  "$(curl -s -o /dev/null -w "%{http_code}" "$API/clients")"
check "GET /loans (no token) → 401" "401" \
  "$(curl -s -o /dev/null -w "%{http_code}" "$API/loans")"

# ── Logout ───────────────────────────────────────────────────
yellow ""
yellow "LOGOUT"
check "POST /auth/logout" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/logout" -H "Authorization: Bearer $TOKEN")"

# ── Summary ──────────────────────────────────────────────────
echo ""
bold "=========================================================="
bold " RESULTS: $PASS/$TOTAL passed  |  $FAIL failed"
bold "=========================================================="
[ "$FAIL" -gt 0 ] && red "Some tests failed — check the backend logs" || green "All tests passed!"
echo ""
