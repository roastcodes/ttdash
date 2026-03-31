#!/usr/bin/env bash
set -euo pipefail

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

step=0
total=3

info()  { step=$((step + 1)); echo -e "\n${BLUE}${BOLD}[$step/$total]${NC} $1"; }
ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; exit 1; }

cd "$(dirname "$0")"

echo -e "${BOLD}ccusage-dashboard${NC} installer"
echo -e "${DIM}$(pwd)${NC}"

# 1 — Dependencies
info "Installiere Abhängigkeiten..."
if npm install --no-audit --no-fund 2>&1 | tail -1; then
  ok "npm install abgeschlossen"
else
  fail "npm install fehlgeschlagen"
fi

# 2 — Build
info "Baue Frontend..."
if npm run build 2>&1 | tail -1; then
  ok "Build abgeschlossen (dist/)"
else
  fail "Build fehlgeschlagen"
fi

# 3 — Global install
info "Installiere global..."
if npm install -g . 2>&1 | tail -1; then
  ok "Global installiert"
else
  fail "Globale Installation fehlgeschlagen (evtl. sudo nötig)"
fi

echo ""
echo -e "${GREEN}${BOLD}Fertig!${NC} Starte das Dashboard mit:"
echo -e "  ${BOLD}ccusage-dashboard${NC}"
