#!/usr/bin/env bash
# 40 Runs the lesson video player pages (YouTube, Vimeo, Bunny Stream behind
# the app's own controls) in headless Chromium against stand-in players that
# implement the same JavaScript APIs, and checks that every tap lands on the
# app's layer, nothing opens the video site, and events and commands flow.
#
#   tool/check_player_pages.sh [screenshots-dir]
#
# Uses Playwright from platform/web/node_modules (npm ci there first).
set -euo pipefail

cd "$(dirname "$0")/.."
pages="$(mktemp -d)"
shots="${1:-$pages/shots}"
mkdir -p "$shots"
PLAYER_PAGES_DIR="$pages" flutter test test/browser/player_pages_test.dart
PW_PATH="$(cd ../platform/web && pwd)/node_modules/playwright" \
  node test/browser/player_pages.cjs "$pages" "$shots"
rm -rf "$pages"
