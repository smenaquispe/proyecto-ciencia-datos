@echo off
REM ============================================================================
REM StatsBomb React Dashboard - Batch Script for Windows
REM ============================================================================

echo.
echo ========================================
echo  StatsBomb React Dashboard
echo ========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.7+
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm not found. Please install Node.js 18+
    pause
    exit /b 1
)

echo [1/3] Installing Python dependencies...
pip install -r requirements.txt

echo.
echo [2/3] Running data processor...
python data_processor.py

echo.
echo [3/3] Starting Vite dev server...
npm install
npm run dev

pause
