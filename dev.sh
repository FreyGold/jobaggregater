#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

BUILD_SHARED=false
for arg in "$@"; do
  [ "$arg" = "--build-shared" ] && BUILD_SHARED=true
done

if [ ! -d "$ROOT_DIR/packages/shared/dist" ]; then
  echo "Shared package not built. Building..."
  BUILD_SHARED=true
fi

if [ "$BUILD_SHARED" = true ]; then
  (cd "$ROOT_DIR" && pnpm build:shared)
fi

cleanup() {
  echo "Shutting down..."
  kill $API_PID $WEB_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

(cd "$ROOT_DIR" && pnpm dev:api) &
API_PID=$!

(cd "$ROOT_DIR" && pnpm dev:web) &
WEB_PID=$!

echo "API (pid $API_PID) — http://localhost:3001"
echo "Web (pid $WEB_PID) — http://localhost:3000"
echo "Press Ctrl+C to stop both."

wait
