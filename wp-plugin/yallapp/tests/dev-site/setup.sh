#!/usr/bin/env bash
# Builds a disposable WordPress site for the plugin's integration tests:
# WordPress + SQLite (no MySQL server needed) + Tutor LMS + this plugin,
# then seeds sample courses. Every source comes from GitHub or Packagist.
#
# Usage: tests/dev-site/setup.sh <site-dir>
# Then:  tests/dev-site/serve.sh <site-dir>   (http://127.0.0.1:8089)
set -euo pipefail

SITE_DIR=${1:?usage: setup.sh <site-dir>}
WP_VERSION=${WP_VERSION:-7.1.3}
TUTOR_VERSION=${TUTOR_VERSION:-4.1.1}
SQLITE_VERSION=${SQLITE_VERSION:-v3.1.0}
WP_CLI_VERSION=${WP_CLI_VERSION:-2.12.0}
PORT=${PORT:-8089}

HERE=$(cd "$(dirname "$0")" && pwd)
PLUGIN_DIR=$(cd "$HERE/../.." && pwd)
CACHE=${YALLAPP_CACHE_DIR:-$HOME/.cache/yallapp-dev}
mkdir -p "$CACHE"

clone() { # repo tag dest
	if [ ! -d "$3" ]; then
		git -c advice.detachedHead=false clone -q --depth 1 --branch "$2" "$1" "$3"
	fi
}

clone https://github.com/WordPress/WordPress.git "$WP_VERSION" "$CACHE/wordpress-$WP_VERSION"
clone https://github.com/WordPress/sqlite-database-integration.git "$SQLITE_VERSION" "$CACHE/sqlite-$SQLITE_VERSION"
clone https://github.com/themeum/tutor.git "v$TUTOR_VERSION" "$CACHE/tutor-$TUTOR_VERSION"
if [ ! -d "$CACHE/tutor-$TUTOR_VERSION/vendor" ]; then
	(cd "$CACHE/tutor-$TUTOR_VERSION" && COMPOSER_ALLOW_SUPERUSER=1 composer install -q --no-dev --no-interaction --prefer-dist --no-scripts)
fi
WP_CLI="$CACHE/wp-cli-$WP_CLI_VERSION.phar"
if [ ! -f "$WP_CLI" ]; then
	curl -sSL -o "$WP_CLI" "https://github.com/wp-cli/wp-cli/releases/download/v$WP_CLI_VERSION/wp-cli-$WP_CLI_VERSION.phar"
fi

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"
SITE_DIR=$(cd "$SITE_DIR" && pwd)
cp -r "$CACHE/wordpress-$WP_VERSION/." "$SITE_DIR/"
rm -rf "$SITE_DIR/.git"

SQLITE_SRC="$CACHE/sqlite-$SQLITE_VERSION/packages/plugin-sqlite-database-integration"
cp -rL "$SQLITE_SRC" "$SITE_DIR/wp-content/plugins/sqlite-database-integration"
sed -e "s#{SQLITE_IMPLEMENTATION_FOLDER_PATH}#$SITE_DIR/wp-content/plugins/sqlite-database-integration#" \
	-e "s#{SQLITE_PLUGIN}#sqlite-database-integration/load.php#" \
	"$SQLITE_SRC/db.copy" > "$SITE_DIR/wp-content/db.php"

cp -r "$CACHE/tutor-$TUTOR_VERSION" "$SITE_DIR/wp-content/plugins/tutor"
rm -rf "$SITE_DIR/wp-content/plugins/tutor/.git" "$SITE_DIR/wp-content/plugins/tutor/node_modules"
ln -s "$PLUGIN_DIR" "$SITE_DIR/wp-content/plugins/yallapp"

cat > "$SITE_DIR/wp-config.php" <<PHP
<?php
define( 'DB_NAME', 'yallapp' );
define( 'DB_USER', '' );
define( 'DB_PASSWORD', '' );
define( 'DB_HOST', '' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );
define( 'DB_DIR', __DIR__ . '/wp-content/database/' );
define( 'DB_FILE', 'yallapp.sqlite' );
define( 'AUTH_KEY', 'dev' );
define( 'SECURE_AUTH_KEY', 'dev' );
define( 'LOGGED_IN_KEY', 'dev' );
define( 'NONCE_KEY', 'dev' );
define( 'AUTH_SALT', 'dev' );
define( 'SECURE_AUTH_SALT', 'dev' );
define( 'LOGGED_IN_SALT', 'dev' );
define( 'NONCE_SALT', 'dev' );
define( 'WP_ENVIRONMENT_TYPE', 'local' );
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );
define( 'YALLAPP_DEV_OTP', true );
\$table_prefix = 'wp_';
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
PHP

wp() { php "$WP_CLI" --path="$SITE_DIR" --allow-root "$@"; }
wp core install --url="http://127.0.0.1:$PORT" --title="Yallapp Dev Academy" \
	--admin_user=admin --admin_password=admin --admin_email=admin@example.org --skip-email --quiet
wp rewrite structure '/%postname%/' --quiet
wp plugin activate tutor --quiet
wp plugin activate yallapp --quiet
wp eval-file "$HERE/seed.php"
echo "Site ready in $SITE_DIR"
