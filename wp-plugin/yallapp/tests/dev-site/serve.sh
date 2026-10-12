#!/usr/bin/env bash
# Serves the dev site built by setup.sh with PHP's built-in server.
set -euo pipefail
SITE_DIR=$(cd "${1:?usage: serve.sh <site-dir>}" && pwd)
PORT=${PORT:-8089}
HERE=$(cd "$(dirname "$0")" && pwd)
exec php -S "127.0.0.1:$PORT" -t "$SITE_DIR" "$HERE/router.php"
