@echo off
REM Double-click this file (on Windows) to start DWLLNG and open it in your browser.
REM The first run installs everything, which can take a minute or two.
REM To stop the app later, close this window.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install it from https://nodejs.org ^(choose the LTS version^), then run this again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo First-time setup: installing DWLLNG ^(this can take a minute^)...
  call npm install
)

if not exist "client\dist" (
  echo Building DWLLNG...
  call npm run build
)

echo Starting DWLLNG...
start "" /min cmd /c "timeout /t 3 /nobreak >nul && start "" http://localhost:4000"

echo.
echo DWLLNG will open at http://localhost:4000 in a few seconds.
echo Leave this window open while you use it. Close this window to stop DWLLNG.
echo.
call npm start
