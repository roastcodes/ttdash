@echo off
setlocal enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%" || exit /b 1
set "INSTALL_TOOL=npm"
set "BUILD_TOOL=npm"
set "GLOBAL_TOOL=npm"
set "APP_VERSION=unknown"
set "APP_NAME=ttdash"

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content -Raw 'package.json' | ConvertFrom-Json).version"`) do set "APP_VERSION=%%v"
for /f "usebackq delims=" %%n in (`powershell -NoProfile -Command "(Get-Content -Raw 'package.json' | ConvertFrom-Json).name"`) do set "APP_NAME=%%n"

echo.
echo  ttdash v%APP_VERSION% installer
echo  %cd%
echo  Platform: Windows ^| User: %USERNAME%
echo.

where bun >nul 2>&1
if %errorlevel% equ 0 (
    set "INSTALL_TOOL=bun"
    set "BUILD_TOOL=bun"
    set "GLOBAL_TOOL=bun"
)

echo  Tooling:
echo    - Install: %INSTALL_TOOL%
echo    - Global: %GLOBAL_TOOL%
echo    - Build target: %cd%\dist
echo.

:: 1 — Dependencies
echo  [1/3] Installing dependencies...
if /i "%INSTALL_TOOL%"=="bun" (
    echo    - Running bun install
    call bun install >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x bun install failed
        exit /b 1
    )
    echo    √ bun install completed
) else (
    echo    - Running npm install --no-audit --no-fund
    call npm install --no-audit --no-fund >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x npm install failed
        exit /b 1
    )
    echo    √ npm install completed
)

:: 2 — Build
echo.
echo  [2/3] Building frontend...
if /i "%BUILD_TOOL%"=="bun" (
    echo    - Running bun run build
    call bun run build >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x Build failed
        exit /b 1
    )
) else (
    echo    - Running npm run build
    call npm run build >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x Build failed
        exit /b 1
    )
)
echo    √ Build completed (dist/)

:: 3 — Global install
echo.
echo  [3/3] Installing globally...
if /i "%GLOBAL_TOOL%"=="bun" (
    for /f "usebackq delims=" %%p in (`bun pm bin -g 2^>nul`) do set "BUN_GLOBAL_BIN=%%p"
    if defined BUN_GLOBAL_BIN (
        for %%d in ("%BUN_GLOBAL_BIN%\..") do set "BUN_ROOT=%%~fd"
        set "BUN_GLOBAL_PACKAGE_JSON=%BUN_ROOT%\install\global\package.json"
        set "BUN_GLOBAL_LOCKFILE=%BUN_ROOT%\install\global\bun.lock"
        set "BUN_CLEANUP_STATUS="
        for /f "usebackq delims=" %%s in (`bun --eval "const fs = require('fs'); const file = process.env.BUN_GLOBAL_PACKAGE_JSON; const name = process.env.APP_NAME; if (!file || !fs.existsSync(file)) { console.log('clean'); process.exit(0); } const raw = fs.readFileSync(file, 'utf8'); const parsed = JSON.parse(raw); const deps = { ...(parsed.dependencies || {}) }; const hadEntry = Object.prototype.hasOwnProperty.call(deps, name); if (hadEntry) { delete deps[name]; } const next = { ...parsed }; if (Object.keys(deps).length > 0) { next.dependencies = deps; } else { delete next.dependencies; } const normalized = JSON.stringify(next, null, 2) + '\n'; const normalizedChanged = raw !== normalized; if (normalizedChanged || hadEntry) { fs.writeFileSync(file, normalized); } if (hadEntry) { console.log('removed'); } else if (normalizedChanged) { console.log('normalized'); } else { console.log('clean'); }" 2^>nul`) do set "BUN_CLEANUP_STATUS=%%s"
        if /i not "!BUN_CLEANUP_STATUS!"=="clean" (
            if exist "%BUN_GLOBAL_LOCKFILE%" del /f /q "%BUN_GLOBAL_LOCKFILE%" >nul 2>&1
            echo    - Cleaned up existing global Bun entry for %APP_NAME%
        )
    )
    echo    - Trying bun add -g "file:%cd%"
    call bun add -g "file:%cd%" >nul 2>&1
    if !errorlevel! neq 0 (
        echo    ! Global Bun install failed, switching to npm fallback
        echo    - Fallback: npm install -g .
        call npm install -g . >nul 2>&1
        if !errorlevel! neq 0 (
            echo    x Global install failed ^(Bun and npm^)
            exit /b 1
        )
        echo    √ Installed globally via npm
    ) else (
        echo    √ Installed globally via Bun
    )
) else (
    echo    - Running npm install -g .
    call npm install -g . >nul 2>&1
    if !errorlevel! neq 0 (
        echo    x Global install failed ^(try running as admin^)
        exit /b 1
    )
    echo    √ Installed globally
)

echo.
echo  Done! Start the dashboard with:
echo    ttdash
echo.
echo  Next steps:
echo    - Start in the background: ttdash --background
echo    - Stop a background instance: ttdash stop
echo    - Use a different port: set PORT=3010 ^&^& ttdash
echo    - Disable browser auto-open: set NO_OPEN_BROWSER=1 ^&^& ttdash
echo    - Data source in the app: Auto-import or JSON upload
echo    - Installed version: %APP_VERSION%
echo.
echo  Note: If 'ttdash' is not found, open a new terminal
echo  or check your global npm/bun path.
echo.
