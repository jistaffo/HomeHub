#!/bin/bash
# Double-click this on a Mac to update Top 10 and start it.
# It fetches the latest version (when this folder came from GitHub), installs
# anything new, opens the app in your browser, and keeps running until you
# close this window.

cd "$(dirname "$0")" || exit 1

# Stop a copy that's already running, so the new one can start.
pkill -f "node server.js" 2>/dev/null

if xcode-select -p >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Getting the latest version..."
  GIT_TERMINAL_PROMPT=0 git pull --ff-only -q || echo "(Couldn't fetch updates. Starting the version you have.)"
fi

if [ ! -f .env ]; then
  echo "Note: there's no .env file in this folder, so movie search won't work yet."
fi

echo "Installing anything new..."
npm install --silent --no-audit --no-fund

(sleep 2; open "http://localhost:4100") &
echo "Top 10 is starting. Leave this window open; close it to stop the app."
npm start
