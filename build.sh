#!/bin/bash

# Network 3D Scanner - Production Build Script
# Usage: ./build.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         NETWORK 3D SCANNER - Production Build          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for Go
if ! command -v go &> /dev/null; then
    echo -e "${RED}[ERROR] Go is not installed or not in PATH.${NC}"
    echo "Please install Go 1.21+ from: https://go.dev/dl/"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Go version: $(go version | cut -d' ' -f3)"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed or not in PATH.${NC}"
    echo "Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Node.js version: $(node --version)"

# Check for Wails CLI
if ! command -v wails &> /dev/null; then
    echo -e "${YELLOW}[INFO]${NC} Installing Wails CLI..."
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install Wails CLI.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}[OK]${NC} Wails version: $(wails version)"
echo ""

# Detect platform
PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case $ARCH in
    x86_64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) ARCH="amd64" ;;
esac

BUILD_PLATFORM="${PLATFORM}/${ARCH}"
echo -e "${BLUE}[INFO]${NC} Building for platform: ${BUILD_PLATFORM}"
echo ""

# Parse arguments
BUILD_OPTS="-platform ${BUILD_PLATFORM}"
GENERATE_NSIS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --nsis)
            GENERATE_NSIS=true
            shift
            ;;
        --icon)
            ICON_FILE="$2"
            if [ -f "$ICON_FILE" ]; then
                BUILD_OPTS="$BUILD_OPTS -icon $ICON_FILE"
                echo -e "${GREEN}[OK]${NC} Using custom icon: $ICON_FILE"
            fi
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [ "$GENERATE_NSIS" = true ]; then
    BUILD_OPTS="$BUILD_OPTS -nsis"
fi

# Clean previous build
echo -e "${BLUE}[STEP 1/4]${NC} Cleaning previous build..."
rm -rf build/bin 2>/dev/null || true
echo -e "${GREEN}[OK]${NC} Build directory cleaned."

# Install frontend dependencies
echo ""
echo -e "${BLUE}[STEP 2/4]${NC} Installing frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    cd frontend
    npm install
    cd ..
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install frontend dependencies.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}[OK]${NC} Frontend dependencies ready."

# Build frontend
echo ""
echo -e "${BLUE}[STEP 3/4]${NC} Building frontend..."
cd frontend
npm run build
cd ..
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Frontend build failed.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Frontend built successfully."

# Build executable
echo ""
echo -e "${BLUE}[STEP 4/4]${NC} Building executable..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "Building command: ${YELLOW}wails build $BUILD_OPTS${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""

wails build $BUILD_OPTS

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] Build failed. Check the error messages above.${NC}"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}[SUCCESS]${NC} Build completed successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""

# List output files
echo "Output files:"
if [ -f "build/bin/network-3d-scanner" ]; then
    SIZE=$(du -h "build/bin/network-3d-scanner" | cut -f1)
    echo -e "  ${GREEN}-${NC} build/bin/network-3d-scanner ($SIZE)"
fi
if [ -f "build/bin/network-3d-scanner_setup.exe" ]; then
    SIZE=$(du -h "build/bin/network-3d-scanner_setup.exe" | cut -f1)
    echo -e "  ${GREEN}-${NC} build/bin/network-3d-scanner_setup.exe ($SIZE)"
fi

echo ""
echo -e "You can find the executable in: ${CYAN}$(pwd)/build/bin/${NC}"
echo ""
