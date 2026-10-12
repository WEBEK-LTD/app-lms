#!/usr/bin/env bash
# Builds the dev site, serves it, and runs the end-to-end API checks.
#
# Usage: [LMS=<id>] tests/integration/run.sh [site-dir]
#        Without LMS: Tutor LMS and its full suite (api-test.php).
#        LMS=learnpress|lifterlms|masterstudy|sensei|masteriyo: that LMS and adapter-test.php.
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
SITE_DIR=${1:-$(mktemp -d)/site}
PORT=${PORT:-8089}
WP_CLI_VERSION=${WP_CLI_VERSION:-2.12.0}
CACHE=${YALLAPP_CACHE_DIR:-$HOME/.cache/yallapp-dev}
LMS=${LMS:-}

LMS=${LMS:-tutor} PORT=$PORT "$HERE/../dev-site/setup.sh" "$SITE_DIR"
SITE_DIR=$(cd "$SITE_DIR" && pwd)

PORT=$PORT "$HERE/../dev-site/serve.sh" "$SITE_DIR" > "$SITE_DIR/server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do
	curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break
	sleep 0.2
done

export WP_CLI="php $CACHE/wp-cli-$WP_CLI_VERSION.phar --path=$SITE_DIR --allow-root"
SEED_IDS=$($WP_CLI option get yallapp_seed_ids --format=json)
export SEED_IDS
if [ -z "$LMS" ] || [ "$LMS" = tutor ]; then
	php "$HERE/api-test.php" "http://127.0.0.1:$PORT"
else
	LMS=$LMS php "$HERE/adapter-test.php" "http://127.0.0.1:$PORT"
fi

if grep -q 'plugins/yallapp' "$SITE_DIR/wp-content/debug.log" 2>/dev/null; then
	echo "PHP notices from the plugin:"
	grep 'plugins/yallapp' "$SITE_DIR/wp-content/debug.log"
	exit 1
fi
