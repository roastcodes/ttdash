#!/usr/bin/env bash
set -euo pipefail

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

step=0
total=3
install_tool="npm"
global_tool="npm"
version="$(sed -n 's/.*"version": "\(.*\)".*/\1/p' package.json | head -1)"

if [ -z "$version" ]; then
  version="unbekannt"
fi

info()  { step=$((step + 1)); printf "\n${BLUE}${BOLD}[$step/$total]${NC} %s\n" "$1"; }
ok()    { printf "  ${GREEN}✓${NC} %s\n" "$1"; }
fail()  { printf "  ${RED}✗${NC} %s\n" "$1"; exit 1; }
warn()  { printf "  ${RED}!${NC} %s\n" "$1"; }
note()  { printf "  ${DIM}› %s${NC}\n" "$1"; }

cd "$(dirname "$0")"

printf "${BOLD}ttdash v%s${NC} installer\n" "$version"
printf "${DIM}%s${NC}\n" "$(pwd)"
printf "${DIM}Plattform: %s | Shell: %s${NC}\n" "$(uname -s)" "${SHELL:-unbekannt}"

if command -v bun >/dev/null 2>&1; then
  install_tool="bun"
  global_tool="bun"
fi

note "Paketmanager für Installation: $install_tool"
note "Globaler Installer: $global_tool"
note "Build-Ziel: $(pwd)/dist"

# 1 — Dependencies
info "Installiere Abhängigkeiten..."
if [ "$install_tool" = "bun" ]; then
  note "Führe bun install aus"
  if bun install 2>&1 | tail -1; then
    ok "bun install abgeschlossen"
  else
    fail "bun install fehlgeschlagen"
  fi
else
  note "Führe npm install --no-audit --no-fund aus"
  if npm install --no-audit --no-fund 2>&1 | tail -1; then
    ok "npm install abgeschlossen"
  else
    fail "npm install fehlgeschlagen"
  fi
fi

# 2 — Build
info "Baue Frontend..."
if [ "$install_tool" = "bun" ]; then
  note "Führe bun run build aus"
  if bun run build 2>&1 | tail -1; then
    ok "Build abgeschlossen (dist/)"
  else
    fail "Build fehlgeschlagen"
  fi
else
  note "Führe npm run build aus"
  if npm run build 2>&1 | tail -1; then
    ok "Build abgeschlossen (dist/)"
  else
    fail "Build fehlgeschlagen"
  fi
fi

# 3 — Global install
info "Installiere global..."
if [ "$global_tool" = "bun" ]; then
  note "Versuche globale Installation mit bun add -g file:$(pwd)"
  if bun add -g "file:$(pwd)" 2>&1 | tail -1; then
    ok "Global via Bun installiert"
  else
    warn "Globale Bun-Installation fehlgeschlagen, wechsle auf npm-Fallback"
    note "Fallback: npm install -g ."
    if npm install -g . 2>&1 | tail -1; then
      ok "Global via npm installiert"
    else
      fail "Globale Installation fehlgeschlagen (Bun und npm)"
    fi
  fi
else
  note "Führe npm install -g . aus"
  if npm install -g . 2>&1 | tail -1; then
    ok "Global installiert"
  else
    fail "Globale Installation fehlgeschlagen (evtl. sudo nötig)"
  fi
fi

printf "\n${GREEN}${BOLD}Fertig!${NC} Starte das Dashboard mit:\n"
printf "  ${BOLD}ttdash${NC}\n"
printf "\n${BOLD}Nächste Schritte${NC}\n"
printf "  ${DIM}• App lokal starten:${NC} ttdash\n"
printf "  ${DIM}• Anderen Port verwenden:${NC} PORT=3010 ttdash\n"
printf "  ${DIM}• Browser-Autostart deaktivieren:${NC} NO_OPEN_BROWSER=1 ttdash\n"
printf "  ${DIM}• Datenquelle im UI:${NC} Auto-Import oder JSON-Upload\n"
printf "  ${DIM}• Installierte Version:${NC} %s\n" "$version"
printf "\n${YELLOW}Hinweis:${NC} Falls 'ttdash' nicht gefunden wird, starte ein neues Terminal\n"
printf "oder prüfe deinen globalen Paketpfad.\n"
