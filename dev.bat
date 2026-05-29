@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         NETWORK 3D SCANNER - Development Mode           ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Check for Go installation
where go >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Go is not installed or not in PATH.
    echo Please install Go 1.21+ from: https://go.dev/dl/
    pause
    exit /b 1
)

:: Check Go version
for /f "tokens=2" %%i in ('go version') do set GOVER=%%i
echo [OK] Go version: %GOVER%

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODEVER=%%i
echo [OK] Node.js version: %NODEVER%

:: Check for Wails CLI
where wails >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing Wails CLI...
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Wails CLI.
        pause
        exit /b 1
    )
    echo [OK] Wails CLI installed successfully.
)

for /f "tokens=*" %%i in ('wails version') do set WAILVER=%%i
echo [OK] Wails version: %WAILVER%
echo.

:: Install frontend dependencies if needed
echo [1/2] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installed.
) else (
    echo [OK] Frontend dependencies already installed.
)

echo.
echo [2/2] Starting development server...
echo.
echo ═══════════════════════════════════════════════════════════
echo Press Ctrl+C to stop the development server.
echo ═══════════════════════════════════════════════════════════
echo.

:: Run Wails development mode
wails dev

pause
