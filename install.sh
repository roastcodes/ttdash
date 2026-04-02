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
install_tool="npm"
global_tool="npm"

info()  { step=$((step + 1)); printf "\n${BLUE}${BOLD}[$step/$total]${NC} %s\n" "$1"; }
ok()    { printf "  ${GREEN}✓${NC} %s\n" "$1"; }
fail()  { printf "  ${RED}✗${NC} %s\n" "$1"; exit 1; }

cd "$(dirname "$0")"

printf "${BOLD}ttdash${NC} installer\n"
printf "${DIM}%s${NC}\n" "$(pwd)"

if command -v bun >/dev/null 2>&1; then
  install_tool="bun"
  global_tool="bun"
fi

# 1 — Dependencies
info "Installiere Abhängigkeiten..."
if [ "$install_tool" = "bun" ]; then
  if bun install 2>&1 | tail -1; then
    ok "bun install abgeschlossen"
  else
    fail "bun install fehlgeschlagen"
  fi
else
  if npm install --no-audit --no-fund 2>&1 | tail -1; then
    ok "npm install abgeschlossen"
  else
    fail "npm install fehlgeschlagen"
  fi
fi

# 2 — Build
info "Baue Frontend..."
if [ "$install_tool" = "bun" ]; then
  if bun run build 2>&1 | tail -1; then
    ok "Build abgeschlossen (dist/)"
  else
    fail "Build fehlgeschlagen"
  fi
else
  if npm run build 2>&1 | tail -1; then
    ok "Build abgeschlossen (dist/)"
  else
    fail "Build fehlgeschlagen"
  fi
fi

# 3 — Global install
info "Installiere global..."
if [ "$global_tool" = "bun" ]; then
  if bun link --global 2>&1 | tail -1; then
    ok "Global via Bun verlinkt"
  else
    fail "Globale Bun-Installation fehlgeschlagen"
  fi
else
  if npm install -g . 2>&1 | tail -1; then
    ok "Global installiert"
  else
    fail "Globale Installation fehlgeschlagen (evtl. sudo nötig)"
  fi
fi

printf "\n${GREEN}${BOLD}Fertig!${NC} Starte das Dashboard mit:\n"
printf "  ${BOLD}ttdash${NC}\n"
