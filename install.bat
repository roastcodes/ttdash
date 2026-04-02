@echo off
setlocal enabledelayedexpansion
set "INSTALL_TOOL=npm"
set "BUILD_TOOL=npm"
set "GLOBAL_TOOL=npm"

echo.
echo  ttdash installer
echo  %cd%
echo.

where bun >nul 2>&1
if %errorlevel% equ 0 (
    set "INSTALL_TOOL=bun"
    set "BUILD_TOOL=bun"
    set "GLOBAL_TOOL=bun"
)

:: 1 — Dependencies
echo  [1/3] Installiere Abhangigkeiten...
if /i "%INSTALL_TOOL%"=="bun" (
    call bun install >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x bun install fehlgeschlagen
        exit /b 1
    )
    echo    √ bun install abgeschlossen
) else (
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
    call bun run build >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x Build fehlgeschlagen
        exit /b 1
    )
) else (
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
    call bun add -g file:%cd% >nul 2>&1
    if !errorlevel! neq 0 (
        echo    ! Globale Bun-Installation fehlgeschlagen, wechsle auf npm-Fallback
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
