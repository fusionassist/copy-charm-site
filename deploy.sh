#!/usr/bin/env bash
# Deploy script for beta.interactivedisplays.ie on the Plesk server.
#
# Usage on the server:
#   ssh beta_displays@78.153.200.34
#   cd ~/apps/copy-charm-site
#   ./deploy.sh
#
# What it does:
#   1. Pulls the latest main branch
#   2. Installs dependencies if package.json changed
#   3. Builds the production bundle
#   4. Kills the running Node process so the cron supervisor restarts it
#      within ~60s with the fresh build
#
# The cron supervisor is at ~/bin/beta-node-supervisor.sh and runs every
# minute via the user's crontab. It uses logs/app.pid to track the live
# process. See docs/PLESK_DEPLOY.md for the full picture.
set -euo pipefail

cd "$(dirname "$0")"

APP_DIR="$(pwd)"
PID_FILE="$APP_DIR/logs/app.pid"
BUN="$HOME/.bun/bin/bun"

echo "==> 1/4 git pull"
# Vite regenerates src/routeTree.gen.ts during every build, which dirties
# the working tree and makes the NEXT deploy's --ff-only pull abort (bit
# us 2026-06-11). It's a generated file — discard local changes first.
git checkout -- src/routeTree.gen.ts 2>/dev/null || true
git pull --ff-only

echo "==> 2/4 bun install"
"$BUN" install

echo "==> 3/4 bun run build"
"$BUN" run build

echo "==> 4/4 restart Node process"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "    killing PID $(cat "$PID_FILE")"
  kill "$(cat "$PID_FILE")"
  rm -f "$PID_FILE"
fi
# Trigger the supervisor immediately so we don't wait up to 60s for the
# next cron tick.
"$HOME/bin/beta-node-supervisor.sh"

sleep 2
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "==> done — app running as PID $(cat "$PID_FILE")"
else
  echo "!!! app did not start — check logs/app.log"
  tail -20 "$APP_DIR/logs/app.log"
  exit 1
fi
