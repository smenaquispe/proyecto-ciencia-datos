#!/bin/bash

set -e

echo ""
echo "========================================"
echo " StatsBomb React Dashboard"
echo "========================================"
echo ""

if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found. Please install Python 3.7+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "[ERROR] Node.js / npm not found. Please install Node.js 18+"
    exit 1
fi

echo "[1/3] Installing Python dependencies..."
pip3 install -r requirements.txt

echo ""
echo "[2/3] Running data processor..."
python3 data_processor.py

echo ""
echo "[3/3] Starting Vite dev server..."
npm install
npm run dev
