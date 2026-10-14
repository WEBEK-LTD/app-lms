#!/usr/bin/env bash
# Builds the app preview (roadmap 17): the web build of this app, which the
# platform serves at /preview-app/ (platform/web/public/preview-app). The
# dashboard's "Preview your app" opens it with a preview link; the app then
# reads its build config from the platform, so the bundle holds no client data.
#
#   tool/build_preview.sh           build and copy the bundle to the platform
#   tool/build_preview.sh --check   fail when the committed bundle is older than
#                                   the app's sources (CI)
#
# The bundle is committed because Netlify builds the platform without Flutter.
# `source.sha256` in the bundle is a fingerprint of everything it is built
# from (the app's code, web files, assets, packages and the Flutter version),
# so the check doesn't depend on the compiler writing identical files.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=../platform/web/public/preview-app
FLUTTER_VERSION=3.47.5

fingerprint() {
  {
    echo "flutter $FLUTTER_VERSION, canvaskit local"
    find lib web assets -type f | LC_ALL=C sort | while read -r file; do
      printf '%s  %s\n' "$(sha256sum "$file" | cut -d' ' -f1)" "$file"
    done
    sha256sum pubspec.yaml pubspec.lock l10n.yaml
  } | sha256sum | cut -d' ' -f1
}

if [ "${1:-}" = "--check" ]; then
  expected="$(fingerprint)"
  actual="$(cat "$OUT/source.sha256" 2>/dev/null || true)"
  if [ "$expected" != "$actual" ]; then
    echo "The app preview in platform/web/public/preview-app is out of date." >&2
    echo "Run mobile/tool/build_preview.sh and commit the result." >&2
    exit 1
  fi
  echo "The app preview is up to date."
  exit 0
fi

flutter build web --release --base-href /preview-app/ --no-wasm-dry-run --no-web-resources-cdn

# Only what the browser loads. CanvasKit is served with the app (not from a
# CDN), so the preview never depends on another server: the default build
# and the one Chromium browsers pick. Skwasm builds aren't made (dart2js only).
rm -rf "$OUT"
mkdir -p "$OUT/canvaskit/chromium"
cp build/web/index.html build/web/flutter_bootstrap.js build/web/main.dart.js \
  build/web/version.json build/web/favicon.png "$OUT/"
cp -R build/web/assets "$OUT/assets"
cp build/web/canvaskit/canvaskit.js build/web/canvaskit/canvaskit.wasm "$OUT/canvaskit/"
cp build/web/canvaskit/chromium/canvaskit.js build/web/canvaskit/chromium/canvaskit.wasm "$OUT/canvaskit/chromium/"
fingerprint > "$OUT/source.sha256"
du -sh "$OUT"
