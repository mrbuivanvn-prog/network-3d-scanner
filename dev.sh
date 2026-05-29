#!/bin/bash

# Network 3D Scanner - Development Script
# Usage: ./dev.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         NETWORK 3D SCANNER - Development Mode           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
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
    echo -e "${GREEN}[OK]${NC} Wails CLI installed successfully."
fi
echo -e "${GREEN}[OK]${NC} Wails version: $(wails version)"
echo ""

# Install frontend dependencies if needed
echo -e "${BLUE}[1/2]${NC} Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install frontend dependencies.${NC}"
        exit 1
    fi
    echo -e "${GREEN}[OK]${NC} Frontend dependencies installed."
else
    echo -e "${GREEN}[OK]${NC} Frontend dependencies already installed."
fi

echo ""
echo -e "${BLUE}[2/2]${NC} Starting development server..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Press Ctrl+C to stop the development server."
echo "═══════════════════════════════════════════════════════════"
echo ""

# Run Wails development mode
wails dev
