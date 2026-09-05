#!/usr/bin/env bash
# Run this to start DWLLNG and open it in your browser (Linux, or Mac from a terminal).
# The first run installs everything, which can take a minute or two.
# To stop the app later, press Ctrl+C.

set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install it from https://nodejs.org (choose the LTS version), then run this again."
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

for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:4000; then
    break
  fi
  sleep 0.5
done
xdg-open "http://localhost:4000" 2>/dev/null || echo "Open http://localhost:4000 in your browser."

echo ""
echo "DWLLNG is running at http://localhost:4000"
echo "Press Ctrl+C to stop it."
wait $SERVER_PID
