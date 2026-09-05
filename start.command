#!/usr/bin/env bash
# Double-click this file (on Mac) to start DWLLNG and open it in your browser.
# The first run installs everything, which can take a minute or two.
# To stop the app later, close this window or press Ctrl+C.

set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install it from https://nodejs.org (choose the LTS version), then run this again."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "First-time setup: installing DWLLNG (this can take a minute)..."
  npm install
fi

if [ ! -d "client/dist" ]; then
  echo "Building DWLLNG..."
  npm run build
fi

echo "Starting DWLLNG..."
npm start &
SERVER_PID=$!

# Wait for the server to come up, then open the browser.
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:4000; then
    break
  fi
  sleep 0.5
done
open "http://localhost:4000" 2>/dev/null || true

echo ""
echo "DWLLNG is running at http://localhost:4000"
echo "Leave this window open while you use it. Close this window to stop DWLLNG."
wait $SERVER_PID
