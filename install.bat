@echo off
setlocal enabledelayedexpansion
set "INSTALL_TOOL=npm"
set "BUILD_TOOL=npm"
set "GLOBAL_TOOL=npm"
set "APP_VERSION=unbekannt"

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content -Raw 'package.json' | ConvertFrom-Json).version"`) do set "APP_VERSION=%%v"

echo.
echo  ttdash v%APP_VERSION% installer
echo  %cd%
echo  Plattform: Windows ^| Benutzer: %USERNAME%
echo.

where bun >nul 2>&1
if %errorlevel% equ 0 (
    set "INSTALL_TOOL=bun"
    set "BUILD_TOOL=bun"
    set "GLOBAL_TOOL=bun"
)

echo  Tooling:
echo    - Installation: %INSTALL_TOOL%
echo    - Global: %GLOBAL_TOOL%
echo    - Build-Ziel: %cd%\dist
echo.

:: 1 — Dependencies
echo  [1/3] Installiere Abhangigkeiten...
if /i "%INSTALL_TOOL%"=="bun" (
    echo    - Fuehre bun install aus
    call bun install >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x bun install fehlgeschlagen
        exit /b 1
    )
    echo    √ bun install abgeschlossen
) else (
    echo    - Fuehre npm install --no-audit --no-fund aus
    call npm install --no-audit --no-fund >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x npm install fehlgeschlagen
        exit /b 1
    )
    echo    √ npm install abgeschlossen
)

:: 2 — Build
echo.
echo  [2/3] Baue Frontend...
if /i "%BUILD_TOOL%"=="bun" (
    echo    - Fuehre bun run build aus
    call bun run build >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x Build fehlgeschlagen
        exit /b 1
    )
) else (
    echo    - Fuehre npm run build aus
    call npm run build >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x Build fehlgeschlagen
        exit /b 1
    )
)
echo    √ Build abgeschlossen (dist/)

:: 3 — Global install
echo.
echo  [3/3] Installiere global...
if /i "%GLOBAL_TOOL%"=="bun" (
    echo    - Versuche bun add -g file:%cd%
    call bun add -g file:%cd% >nul 2>&1
    if !errorlevel! neq 0 (
        echo    ! Globale Bun-Installation fehlgeschlagen, wechsle auf npm-Fallback
        echo    - Fallback: npm install -g .
        call npm install -g . >nul 2>&1
        if !errorlevel! neq 0 (
            echo    x Globale Installation fehlgeschlagen ^(Bun und npm^)
            exit /b 1
        )
        echo    √ Global via npm installiert
    ) else (
        echo    √ Global via Bun installiert
    )
) else (
    echo    - Fuehre npm install -g . aus
    call npm install -g . >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x Globale Installation fehlgeschlagen (evtl. als Admin ausfuehren)
        exit /b 1
    )
    echo    √ Global installiert
)

echo.
echo  Fertig! Starte das Dashboard mit:
echo    ttdash
echo.
echo  Naechste Schritte:
echo    - Anderen Port verwenden: set PORT=3010 ^&^& ttdash
echo    - Browser-Autostart deaktivieren: set NO_OPEN_BROWSER=1 ^&^& ttdash
echo    - Datenquelle in der App: Auto-Import oder JSON-Upload
echo    - Installierte Version: %APP_VERSION%
echo.
echo  Hinweis: Falls 'ttdash' nicht gefunden wird, oeffne ein neues Terminal
echo  oder pruefe deinen globalen npm-/bun-Pfad.
echo.
