#!/usr/bin/env bash
# Builds the dev site, serves it, and runs the end-to-end API checks.
#
# Usage: [LMS=<id>] [APP=store|bookings|news] [BOOKING=<id>] tests/integration/run.sh [site-dir]
#        Without LMS: Tutor LMS and its full suite (api-test.php).
#        LMS=learnpress|lifterlms|masterstudy|sensei|masteriyo: that LMS and adapter-test.php.
#        LMS=learndash LEARNDASH_DIR=<unpacked sfwd-lms>: a local LearnDash copy (not on
#        wordpress.org, so not in CI) and adapter-test.php.
#        APP=store: WooCommerce without an LMS and store-test.php.
#        APP=bookings BOOKING=amelia|bookingpress|latepoint: that booking plugin and bookings-test.php.
#        APP=news: a news site (posts only) and news-test.php.
#        WOO=1: Tutor LMS with WooCommerce selling the paid courses and access-test.php (39).
#        UPGRADE_FROM=<git ref>: Tutor LMS and WooCommerce with the plugin as it was at that
#        commit, updated to this one by WordPress's updater, and upgrade-test.php (39).
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
SITE_DIR=${1:-$(mktemp -d)/site}
PORT=${PORT:-8089}
WP_CLI_VERSION=${WP_CLI_VERSION:-2.12.0}
CACHE=${YALLAPP_CACHE_DIR:-$HOME/.cache/yallapp-dev}
LMS=${LMS:-}
APP=${APP:-lms}
WOO=${WOO:-0}
UPGRADE_FROM=${UPGRADE_FROM:-}
PLUGIN_DIR=$(cd "$HERE/../.." && pwd)

PLUGIN_SRC=
WORK=
if [ -n "$UPGRADE_FROM" ]; then
	# The earlier release from git (run in the plugin folder, git archives that folder only),
	# and this one as the zip WordPress downloads.
	WORK=$(mktemp -d)
	git -C "$PLUGIN_DIR" archive --prefix=old/ "$UPGRADE_FROM" | tar -x -C "$WORK"
	PLUGIN_SRC=$WORK/old
	NEW_ZIP=$("$PLUGIN_DIR/bin/build-zip.sh" "$WORK/dist")
	export NEW_ZIP
	WOO=1
fi

APP=$APP LMS=${LMS:-tutor} WOO=$WOO PLUGIN_SRC=$PLUGIN_SRC PORT=$PORT "$HERE/../dev-site/setup.sh" "$SITE_DIR"
SITE_DIR=$(cd "$SITE_DIR" && pwd)
export SITE_DIR

PORT=$PORT "$HERE/../dev-site/serve.sh" "$SITE_DIR" > "$SITE_DIR/server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; [ -z "$WORK" ] || rm -rf "$WORK"' EXIT
for _ in $(seq 1 50); do
	curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break
	sleep 0.2
done

export WP_CLI="php $CACHE/wp-cli-$WP_CLI_VERSION.phar --path=$SITE_DIR --allow-root"
SEED_IDS=$($WP_CLI option get yallapp_seed_ids --format=json)
export SEED_IDS
if [ "$APP" = bookings ]; then
	BOOKING=${BOOKING:-amelia} php "$HERE/bookings-test.php" "http://127.0.0.1:$PORT"
elif [ "$APP" = store ]; then
	php "$HERE/store-test.php" "http://127.0.0.1:$PORT"
elif [ "$APP" = news ]; then
	php "$HERE/news-test.php" "http://127.0.0.1:$PORT"
elif [ -n "$UPGRADE_FROM" ]; then
	php "$HERE/upgrade-test.php" "http://127.0.0.1:$PORT"
elif [ "$WOO" = 1 ]; then
	php "$HERE/access-test.php" "http://127.0.0.1:$PORT"
elif [ -z "$LMS" ] || [ "$LMS" = tutor ]; then
	php "$HERE/api-test.php" "http://127.0.0.1:$PORT"
else
	LMS=$LMS php "$HERE/adapter-test.php" "http://127.0.0.1:$PORT"
fi

if grep -q 'plugins/yallapp' "$SITE_DIR/wp-content/debug.log" 2>/dev/null; then
	echo "PHP notices from the plugin:"
	grep 'plugins/yallapp' "$SITE_DIR/wp-content/debug.log"
	exit 1
fi
