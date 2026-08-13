@echo off
title Desi Bus Simulator
color 0A

echo ============================================
echo    🚌 DESI BUS SIMULATOR - LAUNCHER
echo ============================================
echo.

REM Get the directory where this script is located
set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%src\frontend"

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js >= 16 from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] pnpm is not installed.
    echo Please install it with: npm install -g pnpm
    pause
    exit /b 1
)

REM Ensure dependencies are installed (pnpm install is fast if already up to date)
cd /d "%FRONTEND_DIR%"
call pnpm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
cd /d "%ROOT_DIR%"

REM Check if the server is already running on port 5173
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Game server is already running!
    goto :open_browser
)

echo [INFO] Starting the game server...
echo.

REM Start Vite dev server in the background
start "Desi Bus Simulator Server" cmd /c "cd /d "%FRONTEND_DIR%" && node node_modules\vite\bin\vite.js --host"

echo [INFO] Waiting for the server to start...
timeout /t 3 /nobreak >nul

:open_browser

echo [INFO] Opening the game in your browser...
start http://localhost:5173/

echo.
echo ============================================
echo    ✅ Game is running!
echo    If the browser didn't open, go to:
echo    http://localhost:5173/
echo.
echo    Controls:
echo    W/↑ = Accelerate    S/↓ = Brake
echo    A/← = Steer Left    D/→ = Steer Right
echo    SPACE = Horn        C = Camera
echo    R = Reset
echo ============================================
echo.
echo Press any key to close this window (game keeps running)...
pause >nul