#!/usr/bin/env bash
# Regenerates the website's app screenshots (platform/web/public/screens/)
# from the real app: test/screenshots/website_screenshots_test.dart renders
# each screen with the demo content, the bundled fonts and Material
# Symbols, at 360 x 780 points and 3x (1080 x 2340 PNG).
#
#   tool/screenshots.sh            write every screenshot
#   tool/screenshots.sh store      only those whose name matches "store"
#   tool/screenshots.sh --check    compare with the committed files instead
#
# The normal `flutter test` run skips these tests.
set -euo pipefail

cd "$(dirname "$0")/.."

# The demo businesses are in Istanbul and Cairo: show their times as local.
export TZ=Europe/Istanbul

update=(--update-goldens)
filter=()
for arg in "$@"; do
  case "$arg" in
    --check) update=() ;;
    *) filter=(--plain-name "$arg") ;;
  esac
done

flutter test test/screenshots/website_screenshots_test.dart \
  --dart-define=YALLAPP_SCREENSHOTS=true \
  "${update[@]}" "${filter[@]}"

if [ ${#update[@]} -gt 0 ]; then
  echo "Screenshots written to ../platform/web/public/screens/"
fi
