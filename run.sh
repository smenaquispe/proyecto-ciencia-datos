#!/bin/bash

# ============================================================================
# StatsBomb Data Processor - Shell Script for Linux/Mac
# ============================================================================

echo ""
echo "========================================"
echo " StatsBomb Data Processor"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found. Please install Python 3.7+"
    exit 1
fi

echo "[1/3] Installing dependencies..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    exit 1
fi

echo ""
echo "[2/3] Running data processor..."
python3 data_processor.py

if [ $? -ne 0 ]; then
    echo "[ERROR] Data processor failed"
    exit 1
fi

echo ""
echo "[3/3] Opening visualization..."

# Open in default browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open visualization/index.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open visualization/index.html
fi

echo ""
echo "========================================"
echo " DONE! Check your browser"
echo "========================================"
echo ""
