#!/usr/bin/env bash
# 76 Runs WordPress.org's Plugin Check on the installable zip, the same checks the
# plugin directory runs on an upload. Any error or warning fails. 76.6 The plugin
# isn't listed on WordPress.org and updates itself from Yallapp, so the one check
# against updaters (allowed only outside WordPress.org) is left out, and so are the
# license checks: the plugin is proprietary (LICENSE.txt), which WordPress.org's
# directory doesn't accept, and it isn't listed there.
#
# Usage: bin/plugin-check.sh [work-dir]
set -euo pipefail

PLUGIN_DIR=$(cd "$(dirname "$0")/.." && pwd)
WORK=${1:-$(mktemp -d)}
mkdir -p "$WORK"
WORK=$(cd "$WORK" && pwd)
PLUGIN_CHECK_VERSION=${PLUGIN_CHECK_VERSION:-2.1.0}
WP_CLI_VERSION=${WP_CLI_VERSION:-2.12.0}
CACHE=${YALLAPP_CACHE_DIR:-$HOME/.cache/yallapp-dev}

ZIP=$("$PLUGIN_DIR/bin/build-zip.sh" "$WORK/dist")
SITE=$WORK/site
rm -rf "$SITE"
# A news site needs no LMS, shop or booking plugin.
APP=news "$PLUGIN_DIR/tests/dev-site/setup.sh" "$SITE" > "$WORK/setup.log" 2>&1 || {
	cat "$WORK/setup.log" >&2
	exit 1
}

# Plugin Check from its GitHub release (its dependencies installed for production).
CHECKER=$CACHE/plugin-check-$PLUGIN_CHECK_VERSION
if [ ! -f "$CHECKER/vendor/autoload.php" ] || [ ! -f "$CHECKER/vendor/squizlabs/php_codesniffer/CodeSniffer.conf" ]; then
	rm -rf "$CHECKER"
	git clone -q --depth 1 --branch "$PLUGIN_CHECK_VERSION" https://github.com/WordPress/plugin-check "$CHECKER"
	# Composer's plugins register Plugin Check's own sniffs; Composer skips them for root unless told.
	COMPOSER_ALLOW_SUPERUSER=1 composer install --working-dir="$CHECKER" --no-dev --no-interaction --no-progress -q
fi
cp -r "$CHECKER" "$SITE/wp-content/plugins/plugin-check"

# The zip as WordPress.org gets it, not the source folder the dev site links.
rm -rf "$SITE/wp-content/plugins/yallapp"
unzip -q "$ZIP" -d "$SITE/wp-content/plugins"

WP="php $CACHE/wp-cli-$WP_CLI_VERSION.phar --path=$SITE --allow-root"
$WP plugin activate plugin-check yallapp --quiet
REPORT=$WORK/plugin-check.csv
$WP plugin check yallapp --exclude-checks=plugin_updater --format=csv --fields=file,line,type,code,message > "$REPORT" 2> "$WORK/plugin-check.log" || true
if ! grep -qE "No errors found|^file,line,type,code,message" "$REPORT"; then
	# Neither findings nor its all-clear: the check itself didn't run.
	cat "$REPORT" "$WORK/plugin-check.log" >&2
	exit 1
fi
# WordPress.org's GPL license rules don't apply to the proprietary plugin.
FINDINGS=$(grep -E ',(ERROR|WARNING),' "$REPORT" | grep -vE ',(ERROR|WARNING),(plugin_header_invalid_license|invalid_license|unknown_license),' || true)
if [ -n "$FINDINGS" ]; then
	echo "$FINDINGS" >&2
	echo "Plugin Check: $(echo "$FINDINGS" | wc -l) findings in $(basename "$ZIP")." >&2
	exit 1
fi
echo "Plugin Check: no errors or warnings in $(basename "$ZIP")."
