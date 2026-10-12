#!/usr/bin/env bash
# Builds a disposable WordPress site for the plugin's integration tests:
# WordPress + SQLite (no MySQL server needed) + an LMS or WooCommerce + this
# plugin, then seeds sample courses or products. WordPress, SQLite and Tutor LMS
# come from GitHub; the other plugins are the pinned releases from wordpress.org.
#
# Usage: [LMS=<id>] [APP=store|bookings] [BOOKING=<id>] tests/dev-site/setup.sh <site-dir>
#        LMS: tutor (default), learnpress, lifterlms, masterstudy, sensei, masteriyo
#        APP=store: a shop with WooCommerce and no LMS (seed-store.php)
#        APP=bookings: a booking plugin and no LMS (seed-bookings-<BOOKING>.php);
#        BOOKING: amelia (default), bookingpress, latepoint. SEED=0 skips seeding.
# Then:  tests/dev-site/serve.sh <site-dir>   (http://127.0.0.1:8089)
set -euo pipefail

SITE_DIR=${1:?usage: setup.sh <site-dir>}
APP=${APP:-lms}
LMS=${LMS:-tutor}
if [ "$APP" = store ] || [ "$APP" = bookings ]; then
	LMS=none
fi
BOOKING=${BOOKING:-amelia}
SEED=${SEED:-1}
WP_VERSION=${WP_VERSION:-7.1.3}
TUTOR_VERSION=${TUTOR_VERSION:-4.1.1}
SQLITE_VERSION=${SQLITE_VERSION:-v3.1.0}
WP_CLI_VERSION=${WP_CLI_VERSION:-2.12.0}
WOOCOMMERCE_VERSION=${WOOCOMMERCE_VERSION:-11.2.0}
# Booking plugins: wordpress.org slug and pinned version ("latest" for the newest).
case "$BOOKING" in
	amelia) BOOKING_SLUG=ameliabooking BOOKING_VERSION=${AMELIA_VERSION:-latest} ;;
	bookingpress) BOOKING_SLUG=bookingpress-appointment-booking BOOKING_VERSION=${BOOKINGPRESS_VERSION:-latest} ;;
	latepoint) BOOKING_SLUG=latepoint BOOKING_VERSION=${LATEPOINT_VERSION:-latest} ;;
	*)
		echo "Unknown BOOKING '$BOOKING': use amelia, bookingpress or latepoint." >&2
		exit 2
		;;
esac
PORT=${PORT:-8089}

# wordpress.org slug and pinned version of each LMS other than Tutor.
case "$LMS" in
	tutor | none) ;;
	learnpress) LMS_SLUG=learnpress LMS_VERSION=${LEARNPRESS_VERSION:-4.4.8} ;;
	lifterlms) LMS_SLUG=lifterlms LMS_VERSION=${LIFTERLMS_VERSION:-10.3.2} ;;
	masterstudy) LMS_SLUG=masterstudy-lms-learning-management-system LMS_VERSION=${MASTERSTUDY_VERSION:-3.4.9} ;;
	sensei) LMS_SLUG=sensei-lms LMS_VERSION=${SENSEI_VERSION:-4.26.4} ;;
	masteriyo) LMS_SLUG=learning-management-system LMS_VERSION=${MASTERIYO_VERSION:-1.13.4} ;;
	*)
		echo "Unknown LMS '$LMS': use tutor, learnpress, lifterlms, masterstudy, sensei or masteriyo." >&2
		exit 2
		;;
esac

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
if [ "$LMS" = tutor ]; then
	clone https://github.com/themeum/tutor.git "v$TUTOR_VERSION" "$CACHE/tutor-$TUTOR_VERSION"
	if [ ! -d "$CACHE/tutor-$TUTOR_VERSION/vendor" ]; then
		(cd "$CACHE/tutor-$TUTOR_VERSION" && COMPOSER_ALLOW_SUPERUSER=1 composer install -q --no-dev --no-interaction --prefer-dist --no-scripts)
	fi
	LMS_SRC="$CACHE/tutor-$TUTOR_VERSION"
	LMS_DIR=tutor
fi

# A plugin's release zip as wordpress.org serves it, unpacked once into the cache.
from_wordpress_org() { # slug version
	if [ ! -d "$CACHE/$1-$2" ]; then
		if [ "$2" = latest ]; then
			curl -fsSL -o "$CACHE/$1.$2.zip" "https://downloads.wordpress.org/plugin/$1.zip"
		else
			curl -fsSL -o "$CACHE/$1.$2.zip" "https://downloads.wordpress.org/plugin/$1.$2.zip"
		fi
		rm -rf "$CACHE/$1-unzip"
		unzip -q "$CACHE/$1.$2.zip" -d "$CACHE/$1-unzip"
		mv "$CACHE/$1-unzip/$1" "$CACHE/$1-$2"
		rm -rf "$CACHE/$1-unzip" "$CACHE/$1.$2.zip"
	fi
}
if [ "$LMS" != tutor ] && [ "$LMS" != none ]; then
	from_wordpress_org "$LMS_SLUG" "$LMS_VERSION"
	LMS_SRC="$CACHE/$LMS_SLUG-$LMS_VERSION"
	LMS_DIR=$LMS_SLUG
fi
if [ "$APP" = store ]; then
	from_wordpress_org woocommerce "$WOOCOMMERCE_VERSION"
fi
if [ "$APP" = bookings ]; then
	from_wordpress_org "$BOOKING_SLUG" "$BOOKING_VERSION"
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

if [ "$LMS" != none ]; then
	cp -r "$LMS_SRC" "$SITE_DIR/wp-content/plugins/$LMS_DIR"
	rm -rf "$SITE_DIR/wp-content/plugins/$LMS_DIR/.git" "$SITE_DIR/wp-content/plugins/$LMS_DIR/node_modules"
fi
if [ "$APP" = store ]; then
	cp -r "$CACHE/woocommerce-$WOOCOMMERCE_VERSION" "$SITE_DIR/wp-content/plugins/woocommerce"
fi
if [ "$APP" = bookings ]; then
	cp -r "$CACHE/$BOOKING_SLUG-$BOOKING_VERSION" "$SITE_DIR/wp-content/plugins/$BOOKING_SLUG"
fi
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
if [ "$LMS" = masterstudy ]; then
	# MasterStudy creates this role on admin_init, which WP-CLI never runs, but its
	# first upgrade (on init) already needs it.
	wp role create stm_lms_instructor Instructor --quiet
fi
if [ "$LMS" != none ]; then
	wp plugin activate "$LMS_DIR" --quiet
fi
if [ "$APP" = store ]; then
	wp plugin activate woocommerce --quiet
fi
if [ "$APP" = bookings ]; then
	wp plugin activate "$BOOKING_SLUG" --quiet
fi
if [ "$LMS" = masterstudy ]; then
	# MasterStudy loads its table definitions only in wp-admin, so activating it from
	# WP-CLI creates none of them; run the same functions its activation runs.
	# shellcheck disable=SC2016 # PHP code: its $ variables are PHP's.
	wp eval 'foreach ( glob( STM_LMS_LIBRARY . "/db/tables/*.table.php" ) as $file ) { require_once $file; }
		foreach ( array( "stm_lms_user_answers", "stm_lms_user_cart", "stm_lms_user_chat", "stm_lms_user_conversation", "stm_lms_user_courses", "stm_lms_user_lessons", "stm_lms_user_quizzes", "stm_lms_user_quizzes_times", "stm_lms_user_searches", "stm_lms_curriculum_sections", "stm_lms_curriculum_materials", "stm_lms_order_items" ) as $create ) { $create(); }'
fi
wp plugin activate yallapp --quiet
if [ "$SEED" = 0 ]; then
	:
elif [ "$APP" = bookings ]; then
	wp eval-file "$HERE/seed-bookings-$BOOKING.php"
elif [ "$APP" = store ]; then
	wp eval-file "$HERE/seed-store.php"
elif [ "$LMS" = tutor ]; then
	wp eval-file "$HERE/seed.php"
else
	wp eval-file "$HERE/seed-$LMS.php"
fi
echo "Site ready in $SITE_DIR"
