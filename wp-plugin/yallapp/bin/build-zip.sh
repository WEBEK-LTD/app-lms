#!/usr/bin/env bash
# Builds the installable plugin: dist/yallapp-<version>.zip with a single yallapp/ folder.
# Only runtime files go in; tests, Composer and coding-standard files stay out.
#
# Usage: bin/build-zip.sh [out-dir]
set -euo pipefail

PLUGIN_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT=$(mkdir -p "${1:-$PLUGIN_DIR/dist}" && cd "${1:-$PLUGIN_DIR/dist}" && pwd)
VERSION=$(sed -n "s/^ \* Version: *\([0-9.]*\).*/\1/p" "$PLUGIN_DIR/yallapp.php")
CONSTANT=$(sed -n "s/.*define( 'YALLAPP_VERSION', '\([0-9.]*\)' ).*/\1/p" "$PLUGIN_DIR/yallapp.php")
STABLE=$(sed -n "s/^Stable tag: *\([0-9.]*\).*/\1/p" "$PLUGIN_DIR/readme.txt")
if [ -z "$VERSION" ] || [ "$VERSION" != "$CONSTANT" ] || [ "$VERSION" != "$STABLE" ]; then
	echo "Version mismatch: header '$VERSION', YALLAPP_VERSION '$CONSTANT', readme Stable tag '$STABLE'." >&2
	exit 1
fi

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
mkdir "$STAGE/yallapp"
cp -R "$PLUGIN_DIR/yallapp.php" "$PLUGIN_DIR/uninstall.php" "$PLUGIN_DIR/readme.txt" \
	"$PLUGIN_DIR/includes" "$PLUGIN_DIR/assets" "$STAGE/yallapp/"
find "$STAGE/yallapp" -name '.DS_Store' -delete

ZIP="$OUT/yallapp-$VERSION.zip"
rm -f "$ZIP"
(cd "$STAGE" && find yallapp -type f | LC_ALL=C sort | zip -q -X -@ "$ZIP")
echo "$ZIP"
