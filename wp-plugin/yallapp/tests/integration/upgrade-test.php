<?php
/**
 * 39 Upgrading a live site from an earlier release to this plugin, as WordPress does it.
 *
 * The site runs the earlier release (setup.sh with PLUGIN_SRC). This script saves the
 * settings on the plugin's settings page as the owner does, sets a license as the platform
 * would, signs students in on their phones and enrolls them, then updates the plugin with
 * WordPress's own updater (the update the plugin offers in Dashboard > Updates: the old files
 * are replaced, the plugin stays active and its activation hook does not run). After the
 * update every setting, sign-in, device and enrollment must still be there, the tables
 * upgraded, every route answering and the PHP log clean.
 *
 * Usage: WP_CLI='wp --path=<site>' SEED_IDS='{...}' NEW_ZIP=<this plugin's zip> SITE_DIR=<site>
 *        php upgrade-test.php http://127.0.0.1:8089
 *
 * @package Yallapp
 */

// phpcs:disable -- Standalone CLI test script, not loaded by WordPress.

$site  = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' );
$base  = $site . '/wp-json/yallapp/v1';
$seed  = json_decode( (string) getenv( 'SEED_IDS' ), true );
$zip   = (string) getenv( 'NEW_ZIP' );
$dir   = rtrim( (string) getenv( 'SITE_DIR' ), '/' );
$fails = 0;
$count = 0;
if ( ! is_array( $seed ) || ! is_file( $zip ) || ! is_dir( $dir ) ) {
	fwrite( STDERR, "Set SEED_IDS, NEW_ZIP (the plugin zip to update to) and SITE_DIR.\n" );
	exit( 2 );
}
$jar = tempnam( sys_get_temp_dir(), 'yallapp-jar' );

function call( $method, $path, $body = null, $token = null ) {
	global $base;
	$ch = curl_init( 0 === strpos( $path, 'http' ) ? $path : $base . $path );
	$h  = array( 'Accept: application/json' );
	if ( null !== $body ) {
		$h[] = 'Content-Type: application/json';
		curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $body ) );
	}
	if ( $token ) {
		$h[] = 'Authorization: Bearer ' . $token;
	}
	curl_setopt_array(
		$ch,
		array(
			CURLOPT_CUSTOMREQUEST  => $method,
			CURLOPT_HTTPHEADER     => $h,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_HEADER         => true,
			CURLOPT_TIMEOUT        => 60,
		)
	);
	$raw  = (string) curl_exec( $ch );
	$size = (int) curl_getinfo( $ch, CURLINFO_HEADER_SIZE );
	$out  = array(
		'status'  => (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE ),
		'headers' => strtolower( substr( $raw, 0, $size ) ),
		'raw'     => substr( $raw, $size ),
	);
	curl_close( $ch );
	$out['json'] = json_decode( $out['raw'], true );
	return $out;
}

/**
 * A browser request in wp-admin, with the admin's cookies.
 */
function browse( $url, array $post = null ) {
	global $jar, $site;
	$ch = curl_init( 0 === strpos( $url, 'http' ) ? $url : $site . $url );
	curl_setopt_array(
		$ch,
		array(
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_COOKIEJAR      => $jar,
			CURLOPT_COOKIEFILE     => $jar,
			CURLOPT_COOKIE         => 'wordpress_test_cookie=WP%20Cookie%20check',
			CURLOPT_TIMEOUT        => 120,
		)
	);
	if ( null !== $post ) {
		curl_setopt( $ch, CURLOPT_POST, true );
		curl_setopt( $ch, CURLOPT_POSTFIELDS, http_build_query( $post ) );
	}
	$html   = (string) curl_exec( $ch );
	$status = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
	$final  = (string) curl_getinfo( $ch, CURLINFO_EFFECTIVE_URL );
	curl_close( $ch );
	return array(
		'status' => $status,
		'html'   => $html,
		'url'    => $final,
	);
}

/**
 * The fields a browser would send for a form: the one holding a hidden action input.
 */
function form_fields( $html, $action ) {
	$doc = new DOMDocument();
	libxml_use_internal_errors( true );
	$doc->loadHTML( $html );
	$xp = new DOMXPath( $doc );
	foreach ( $xp->query( '//form' ) as $form ) {
		if ( ! $xp->query( './/input[@name="action"][@value="' . $action . '"]', $form )->length ) {
			continue;
		}
		$pairs = array();
		foreach ( $xp->query( './/input|.//select|.//textarea', $form ) as $el ) {
			$name = $el->getAttribute( 'name' );
			if ( '' === $name || $el->hasAttribute( 'disabled' ) ) {
				continue;
			}
			$type = strtolower( $el->getAttribute( 'type' ) );
			if ( 'input' === $el->nodeName ) {
				if ( in_array( $type, array( 'checkbox', 'radio' ), true ) && ! $el->hasAttribute( 'checked' ) ) {
					continue;
				}
				if ( in_array( $type, array( 'file', 'submit', 'button' ), true ) ) {
					continue;
				}
				$pairs[] = array( $name, $el->hasAttribute( 'value' ) || ! in_array( $type, array( 'checkbox', 'radio' ), true ) ? $el->getAttribute( 'value' ) : 'on' );
			} elseif ( 'textarea' === $el->nodeName ) {
				$pairs[] = array( $name, $el->textContent );
			} else {
				$chosen = $xp->query( './/option[@selected]', $el );
				if ( ! $chosen->length && ! $el->hasAttribute( 'multiple' ) ) {
					$chosen = $xp->query( './/option[1]', $el );
				}
				foreach ( $chosen as $option ) {
					$pairs[] = array( $name, $option->hasAttribute( 'value' ) ? $option->getAttribute( 'value' ) : $option->textContent );
				}
			}
		}
		return $pairs;
	}
	return null;
}

/**
 * URL-encodes form pairs, keeping repeated names (name[]) as a browser does.
 */
function encode_pairs( array $pairs ) {
	return implode(
		'&',
		array_map(
			static function ( $pair ) {
				return rawurlencode( $pair[0] ) . '=' . rawurlencode( $pair[1] );
			},
			$pairs
		)
	);
}

function check( $name, $ok, $detail = '' ) {
	global $fails, $count;
	++$count;
	if ( $ok ) {
		echo "  ok    $name\n";
		return;
	}
	++$fails;
	echo "  FAIL  $name" . ( '' !== $detail ? "\n        " . substr( is_string( $detail ) ? $detail : json_encode( $detail ), 0, 600 ) : '' ) . "\n";
}

function device( $id, $platform = 'android' ) {
	return array(
		'id'          => $id,
		'platform'    => $platform,
		'name'        => 'Phone ' . $id,
		'app_version' => '1.0.0',
	);
}

function wp_cli( $args ) {
	return (string) shell_exec( getenv( 'WP_CLI' ) . ' ' . $args . ' 2>/dev/null' );
}

function wp_eval( $php ) {
	return trim( wp_cli( 'eval ' . escapeshellarg( $php ) ) );
}

function plugin_version( $response ) {
	return preg_match( '/x-yallapp-plugin-version: *([0-9.]+)/', $response['headers'], $m ) ? $m[1] : '';
}

echo "Before the update\n";
$r   = call( 'GET', '/config?platform=android&app_version=1.0.0' );
$old = plugin_version( $r );
check( 'the earlier release answers', 200 === $r['status'] && '' !== $old, $r['raw'] );

// The owner signs in to wp-admin and saves the plugin's settings page.
browse( '/wp-login.php' );
$login = browse(
	'/wp-login.php',
	array(
		'log'        => 'admin',
		'pwd'        => 'admin',
		'testcookie' => '1',
		'redirect_to' => $site . '/wp-admin/',
	)
);
check( 'the owner signs in to wp-admin', false !== strpos( $login['url'], '/wp-admin' ) && false === strpos( $login['url'], 'wp-login' ), $login['url'] );
// Tutor LMS and WooCommerce send the first wp-admin visit after activation to their own pages.
for ( $i = 0; $i < 3; $i++ ) {
	$page = browse( '/wp-admin/admin.php?page=yallapp' );
	if ( false !== strpos( $page['url'], 'page=yallapp' ) ) {
		break;
	}
}
$fields = form_fields( $page['html'], 'yallapp_save' );
check( 'settings page has its form', is_array( $fields ) && count( $fields ) > 10, substr( $page['html'], 0, 300 ) );
$changes = array(
	'yallapp[app_name]'         => 'Dental Academy',
	'yallapp[support_email]'    => 'help@example.org',
	'yallapp[support_whatsapp]' => '+905551112233',
	'yallapp[sign_in_methods]'  => 'both',
	'yallapp[device_limit]'     => '3',
	// Sign-in codes from the dev site's fixed code, not the platform.
	'yallapp[otp_provider]'     => 'dev',
);
$pairs   = array();
foreach ( (array) $fields as $pair ) {
	if ( ! array_key_exists( $pair[0], $changes ) ) {
		$pairs[] = $pair;
	}
}
foreach ( $changes as $name => $value ) {
	$pairs[] = array( $name, $value );
}
$ch = curl_init( $site . '/wp-admin/admin-post.php' );
curl_setopt_array(
	$ch,
	array(
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_COOKIEJAR      => $jar,
		CURLOPT_COOKIEFILE     => $jar,
		CURLOPT_POST           => true,
		CURLOPT_POSTFIELDS     => encode_pairs( $pairs ),
		CURLOPT_HTTPHEADER     => array( 'Referer: ' . $site . '/wp-admin/admin.php?page=yallapp' ),
	)
);
curl_exec( $ch );
$saved_status = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
curl_close( $ch );
$before = json_decode( wp_cli( 'option get yallapp_settings --format=json' ), true );
check( 'settings saved from the page', 302 === $saved_status && 'Dental Academy' === ( $before['app_name'] ?? '' ) && 'both' === ( $before['sign_in_methods'] ?? '' ) && 3 === (int) ( $before['device_limit'] ?? 0 ) && 'dev' === ( $before['otp_provider'] ?? '' ), array( $saved_status, $before ) );

// A license as the platform answers it: an Academy app with phone and email sign-in.
wp_eval(
	'$s = get_option( "yallapp_settings" ); $s["license_key"] = "YALL-TEST-0000-0039"; update_option( "yallapp_settings", $s, false );'
	. ' update_option( "yallapp_license", array( "status" => "active", "plan" => "growth", "features" => array( "push", "offline_downloads" ), "sign_in_methods" => array( "phone", "email" ), "email_sign_in" => "password", "app_type" => "lms", "vertical" => null, "expires_at" => null, "checked_at" => gmdate( "c" ), "message" => null, "contacted_at" => time() ), false );'
);
$before  = json_decode( wp_cli( 'option get yallapp_settings --format=json' ), true );
$license = json_decode( wp_cli( 'option get yallapp_license --format=json' ), true );

// Two students sign in on their phones: one by a code to the phone, one with the password.
$phone = '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT );
$r     = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
$r     = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '123456', 'device' => device( 'up-a' ) ) );
$r     = call( 'POST', '/auth/register', array( 'signup_token' => $r['json']['signup_token'] ?? '', 'name' => 'Selin Aydin', 'device' => device( 'up-a' ) ) );
check( 'a student signs up by phone', 201 === $r['status'] && ! empty( $r['json']['refresh_token'] ), $r['raw'] );
$a    = $r['json'];
$a_id = (int) ( $a['user']['id'] ?? 0 );
$r    = call( 'PUT', '/me/push-token', array( 'token' => 'fcm-before-update', 'preferences' => array( 'new_lessons' => true ) ), $a['access_token'] ?? '' );
check( 'her phone gets notifications', 204 === $r['status'], $r['raw'] );
$r = call( 'POST', '/courses/' . $seed['python'] . '/enroll', array(), $a['access_token'] ?? '' );
check( 'she enrolls in a free course', in_array( $r['status'], array( 200, 201 ), true ), $r['raw'] );
$r = call( 'POST', '/lessons/' . $seed['lesson_html'] . '/complete', array(), $a['access_token'] ?? '' );
check( 'she completes a lesson', 200 === $r['status'], $r['raw'] );

$email = 'upgrade' . random_int( 1000, 9999 ) . '@example.org';
wp_cli( 'user create ' . escapeshellarg( 'u' . md5( $email ) ) . ' ' . escapeshellarg( $email ) . ' --user_pass=' . escapeshellarg( 'Correct horse 39' ) . ' --role=subscriber' );
$r = call( 'POST', '/auth/password', array( 'email' => $email, 'password' => 'Correct horse 39', 'device' => device( 'up-b', 'ios' ) ) );
check( 'a website member signs in with the password', 200 === $r['status'] && ! empty( $r['json']['refresh_token'] ), $r['raw'] );
$b = $r['json'];
wp_eval( 'tutor_utils()->do_enroll( ' . (int) $seed['english'] . ', 0, ' . (int) ( $b['user']['id'] ?? 0 ) . ' );' );

$cron_before = wp_eval( 'echo (int) (bool) wp_next_scheduled( "yallapp_daily" );' );

echo "Update\n";
// The release as the platform offers it; WordPress downloads it from this URL.
copy( $zip, $dir . '/yallapp-update.zip' );
$new = preg_match( '/yallapp-([0-9.]+)\.zip$/', $zip, $m ) ? $m[1] : '';
wp_eval(
	'set_transient( "yallapp_release", array( "version" => "' . $new . '", "download_url" => home_url( "/yallapp-update.zip" ), "requires" => "6.0", "requires_php" => "7.4", "tested" => "7.1" ), HOUR_IN_SECONDS );'
	. ' $t = new stdClass(); $t->last_checked = time(); $t->checked = array( "yallapp/yallapp.php" => YALLAPP_VERSION ); $t->response = array(); set_site_transient( "update_plugins", $t );'
);
$offered = wp_eval( '$t = get_site_transient( "update_plugins" ); echo isset( $t->response["yallapp/yallapp.php"] ) ? $t->response["yallapp/yallapp.php"]->new_version : "";' );
check( 'WordPress offers the update', $new === $offered, $offered );
// The same upgrader the Updates screen uses; it never runs the activation hook.
$out = wp_eval(
	'require_once ABSPATH . "wp-admin/includes/class-wp-upgrader.php"; require_once ABSPATH . "wp-admin/includes/plugin.php";'
	. ' $u = new Plugin_Upgrader( new Automatic_Upgrader_Skin() ); $r = $u->bulk_upgrade( array( "yallapp/yallapp.php" ) );'
	. ' echo is_array( $r ) && ! empty( $r["yallapp/yallapp.php"] ) && ! is_wp_error( $r["yallapp/yallapp.php"] ) ? "updated" : wp_json_encode( $r );'
	. ' echo is_plugin_active( "yallapp/yallapp.php" ) ? " active" : " inactive";'
);
check( 'the upgrader replaces the plugin and it stays active', 'updated active' === $out, $out );
@unlink( $dir . '/yallapp-update.zip' );

echo "After the update\n";
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'the new release answers', 200 === $r['status'] && $new === plugin_version( $r ) && $new !== $old, array( $old, plugin_version( $r ), $r['raw'] ) );
check( 'tables upgraded', '5' === trim( wp_cli( 'option get yallapp_db_version' ) ), wp_cli( 'option get yallapp_db_version' ) );
// 85.4 Campaigns: the inbox keeps a campaign's link and picture.
$inbox = wp_eval( 'global $wpdb; echo implode( ",", $wpdb->get_col( "SELECT name FROM pragma_table_info(\'" . $wpdb->prefix . "yallapp_notifications\')" ) ?: $wpdb->get_col( "SHOW COLUMNS FROM {$wpdb->prefix}yallapp_notifications" ) );' );
check( 'inbox table has the campaign link and picture columns', false !== strpos( $inbox, 'link' ) && false !== strpos( $inbox, 'image_url' ), $inbox );
$columns = wp_eval( 'global $wpdb; echo implode( ",", $wpdb->get_col( "SELECT name FROM pragma_table_info(\'" . $wpdb->prefix . "yallapp_devices\')" ) ?: $wpdb->get_col( "SHOW COLUMNS FROM {$wpdb->prefix}yallapp_devices" ) );' );
check( 'devices table has the push provider column', false !== strpos( $columns, 'push_provider' ), $columns );
$after = json_decode( wp_cli( 'option get yallapp_settings --format=json' ), true );
check( 'every saved setting kept', is_array( $after ) && array_intersect_key( $after, $before ) == $before, array_diff_assoc( array_map( 'json_encode', (array) $before ), array_map( 'json_encode', (array) $after ) ) );
check( 'license kept', json_decode( wp_cli( 'option get yallapp_license --format=json' ), true ) == $license );
check( 'app name, support and sign-in methods reach the app', 'Dental Academy' === ( $r['json']['site']['name'] ?? '' ) && 'help@example.org' === ( $r['json']['site']['support_email'] ?? '' ) && array( 'phone', 'email' ) === ( $r['json']['auth']['methods'] ?? null ), $r['json'] );
check( 'daily cleanup still scheduled', $cron_before === wp_eval( 'echo (int) (bool) wp_next_scheduled( "yallapp_daily" );' ) && '1' === $cron_before );

$r = call( 'GET', '/me', null, $a['access_token'] ?? '' );
check( 'a sign-in from before the update still works', 200 === $r['status'] && 'Selin Aydin' === ( $r['json']['name'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/auth/refresh', array( 'refresh_token' => $a['refresh_token'] ?? '' ) );
check( 'her refresh token from before the update still works', 200 === $r['status'] && ! empty( $r['json']['access_token'] ), $r['raw'] );
$a = $r['json'];
$r = call( 'POST', '/auth/refresh', array( 'refresh_token' => $b['refresh_token'] ?? '' ) );
check( "the member's refresh token still works", 200 === $r['status'] && ! empty( $r['json']['access_token'] ), $r['raw'] );
$b = $r['json'];
$r = call( 'GET', '/me/devices', null, $a['access_token'] ?? '' );
check( 'her device is still registered', 200 === $r['status'] && array( 'up-a' ) === array_column( $r['json']['items'] ?? array(), 'id' ), $r['raw'] );
$r = call( 'GET', '/me/courses', null, $a['access_token'] ?? '' );
check( 'her course and progress are still there', 200 === $r['status'] && $seed['python'] === ( $r['json']['items'][0]['course']['id'] ?? 0 ) && ( $r['json']['items'][0]['progress']['completed_items'] ?? 0 ) >= 1, $r['raw'] );
$r = call( 'GET', '/me/courses', null, $b['access_token'] ?? '' );
check( "the member's course is listed", 200 === $r['status'] && $seed['english'] === ( $r['json']['items'][0]['course']['id'] ?? 0 ), $r['raw'] );
$tokens = wp_eval( 'echo wp_json_encode( Yallapp\Plugin::instance()->devices()->push_targets( array( ' . $a_id . ' ) ) );' );
check( 'her push token is kept, from Firebase', '[{"token":"fcm-before-update","provider":"fcm"}]' === $tokens, $tokens );
$r = call( 'PUT', '/me/push-token', array( 'token' => 'hms-after-update', 'provider' => 'hms', 'preferences' => array( 'new_lessons' => true ) ), $a['access_token'] ?? '' );
check( 'a Huawei push token can be saved', 204 === $r['status'], $r['raw'] );

// Every route of the new release answers (GET routes without parameters; no server errors).
$index  = call( 'GET', $site . '/wp-json/yallapp/v1' );
$routes = array_keys( (array) ( $index['json']['routes'] ?? array() ) );
check( 'the route index lists the routes', count( $routes ) > 40, count( $routes ) );
$broken = array();
foreach ( $routes as $route ) {
	if ( false !== strpos( $route, '(?P' ) || ! in_array( 'GET', (array) ( $index['json']['routes'][ $route ]['methods'] ?? array() ), true ) ) {
		continue;
	}
	$r = call( 'GET', $site . '/wp-json' . $route, null, $a['access_token'] ?? '' );
	// 503 with a code is a feature this site doesn't have (bookings_unavailable, …).
	$unavailable = 503 === $r['status'] && ! empty( $r['json']['code'] );
	if ( ( $r['status'] >= 500 && ! $unavailable ) || ( null === $r['json'] && '' !== $r['raw'] ) ) {
		$broken[] = $route . ' ' . $r['status'];
	}
}
check( 'no route fails', ! $broken, $broken );
$page = browse( '/wp-admin/admin.php?page=yallapp' );
check( 'the settings page opens after the update', 200 === $page['status'] && false !== strpos( $page['html'], 'Dental Academy' ), $page['status'] );

$log = is_file( $dir . '/wp-content/debug.log' ) ? (string) file_get_contents( $dir . '/wp-content/debug.log' ) : '';
preg_match_all( '/^.*plugins\/yallapp.*$/m', $log, $m );
check( 'no PHP errors, warnings or notices from the plugin', ! $m[0], $m[0] );
@unlink( $jar );

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
