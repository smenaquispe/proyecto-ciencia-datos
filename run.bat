@echo off
REM ============================================================================
REM StatsBomb Data Processor - Batch Script for Windows
REM ============================================================================

echo.
echo ========================================
echo  StatsBomb Data Processor
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.7+
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
pip install -r requirements.txt

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Running data processor...
python data_processor.py

if errorlevel 1 (
    echo [ERROR] Data processor failed
    pause
    exit /b 1
)

echo.
echo [3/3] Opening visualization...
start visualization\index.html

echo.
echo ========================================
echo  DONE! Opening visualization in browser
echo ========================================
echo.
pause
