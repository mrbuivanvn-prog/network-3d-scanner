@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         NETWORK 3D SCANNER - Production Build          ║
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
)

for /f "tokens=*" %%i in ('wails version') do set WAILVER=%%i
echo [OK] Wails version: %WAILVER%
echo.

:: Clean previous build
echo [STEP 1/4] Cleaning previous build...
if exist "build\bin" (
    rd /s /q "build\bin" 2>nul
)
echo [OK] Build directory cleaned.

:: Install frontend dependencies
echo [STEP 2/4] Installing frontend dependencies...
if not exist "frontend\node_modules" (
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    cd ..
)
echo [OK] Frontend dependencies ready.

:: Build frontend
echo [STEP 3/4] Building frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend built successfully.

:: Build Windows executable
echo [STEP 4/4] Building Windows executable...
echo.

set BUILD_OPTS=-platform windows/amd64
set OUTPUT_DIR=build\bin

:: Check for icon file
if exist "app-icon.ico" (
    set BUILD_OPTS=%BUILD_OPTS% -icon app-icon.ico
    echo [INFO] Using custom icon: app-icon.ico
) else (
    echo [INFO] No custom icon found, using default.
)

:: Ask for NSIS installer
echo.
echo Build Options:
echo   [1] Build EXE only (portable)
echo   [2] Build with NSIS installer
echo   [3] Build with installer + shortcut
echo.

set /p BUILD_CHOICE="Select option (1-3) [default: 1]: "
if "%BUILD_CHOICE%"=="" set BUILD_CHOICE=1
if "%BUILD_CHOICE%"=="1" (
    set BUILD_OPTS=%BUILD_OPTS%
    echo Building portable EXE...
) else if "%BUILD_CHOICE%"=="2" (
    set BUILD_OPTS=%BUILD_OPTS% -nsis
    echo Building with NSIS installer...
) else if "%BUILD_CHOICE%"=="3" (
    set BUILD_OPTS=%BUILD_OPTS% -nsis -windowsconsole
    echo Building with NSIS installer + console...
) else (
    set BUILD_OPTS=%BUILD_OPTS%
    echo Building portable EXE...
)

echo.
echo ═══════════════════════════════════════════════════════════
echo Building... This may take a few minutes.
echo ═══════════════════════════════════════════════════════════
echo.

wails build %BUILD_OPTS%

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed. Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════════════
echo [SUCCESS] Build completed successfully!
echo ═══════════════════════════════════════════════════════════
echo.

:: List output files
echo Output files:
if exist "build\bin\network-3d-scanner.exe" (
    for %%F in ("build\bin\network-3d-scanner.exe") do echo   - %%F [%%~zF bytes]
)
if exist "build\bin\network-3d-scanner_setup.exe" (
    for %%F in ("build\bin\network-3d-scanner_setup.exe") do echo   - %%F [%%~zF bytes]
)

echo.
echo You can find the executable in: %cd%\build\bin\
echo.
pause
