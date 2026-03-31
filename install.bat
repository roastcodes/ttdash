@echo off
setlocal enabledelayedexpansion

echo.
echo  ccusage-dashboard installer
echo  %cd%
echo.

:: 1 — Dependencies
echo  [1/3] Installiere Abhangigkeiten...
call npm install --no-audit --no-fund >nul 2>&1
if %errorlevel% neq 0 (
    echo    x npm install fehlgeschlagen
    exit /b 1
)
echo    √ npm install abgeschlossen

:: 2 — Build
echo.
echo  [2/3] Baue Frontend...
call npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo    x Build fehlgeschlagen
    exit /b 1
)
echo    √ Build abgeschlossen (dist/)

:: 3 — Global install
echo.
echo  [3/3] Installiere global...
call npm install -g . >nul 2>&1
if %errorlevel% neq 0 (
    echo    x Globale Installation fehlgeschlagen (evtl. als Admin ausfuehren)
    exit /b 1
)
echo    √ Global installiert

echo.
echo  Fertig! Starte das Dashboard mit:
echo    ccusage-dashboard
echo.
