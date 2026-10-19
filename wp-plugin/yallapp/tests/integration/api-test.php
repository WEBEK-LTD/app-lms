<?php
/**
 * End-to-end checks of the app API against a running dev site (tests/dev-site).
 *
 * Usage: WP_CLI='wp --path=<site>' SEED_IDS='{"python":8,...}' php api-test.php http://127.0.0.1:8089
 * The site must define YALLAPP_DEV_OTP so the code 123456 works.
 *
 * @package Yallapp
 */

// phpcs:disable -- Standalone CLI test script, not loaded by WordPress.

$base  = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' ) . '/wp-json/yallapp/v1';
$seed  = json_decode( (string) getenv( 'SEED_IDS' ), true );
$fails = 0;
$count = 0;
if ( ! is_array( $seed ) ) {
	fwrite( STDERR, "Set SEED_IDS to the yallapp_seed_ids option as JSON.\n" );
	exit( 2 );
}

function call( $method, $path, $body = null, $token = null, array $headers = array() ) {
	global $base;
	$ch = curl_init( 0 === strpos( $path, 'http' ) ? $path : $base . $path );
	$h  = array_merge( array( 'Accept: application/json' ), $headers );
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
			CURLOPT_FOLLOWLOCATION => false,
			CURLOPT_TIMEOUT        => 60,
		)
	);
	$raw    = (string) curl_exec( $ch );
	$status = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
	$size   = (int) curl_getinfo( $ch, CURLINFO_HEADER_SIZE );
	curl_close( $ch );
	$head = substr( $raw, 0, $size );
	$text = substr( $raw, $size );
	return array(
		'status'  => $status,
		'headers' => strtolower( $head ),
		'raw'     => $text,
		'json'    => json_decode( $text, true ),
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
		'name'        => 'Test ' . $id,
		'app_version' => '1.0.0',
	);
}

function sign_in( $phone, $device, $name = 'Test Student' ) {
	$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
	if ( 200 !== $r['status'] ) {
		return $r;
	}
	$v = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'], 'code' => '123456', 'device' => $device ) );
	if ( 200 === $v['status'] && ! empty( $v['json']['signup_token'] ) ) {
		return call( 'POST', '/auth/register', array( 'signup_token' => $v['json']['signup_token'], 'name' => $name, 'device' => $device ) );
	}
	return $v;
}

/**
 * Runs WP-CLI against the dev site (WP_CLI env: the command prefix).
 */
function wp_cli( $args ) {
	$prefix = (string) getenv( 'WP_CLI' );
	if ( '' === $prefix ) {
		fwrite( STDERR, "Set WP_CLI to the wp command for the dev site.\n" );
		exit( 2 );
	}
	return shell_exec( $prefix . ' ' . $args . ' 2>/dev/null' );
}

$phone = '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT );

echo "App\n";
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config 200', 200 === $r['status'], $r['raw'] );
check( 'config has lms', isset( $r['json']['features']['lms'] ) && 'tutor' === $r['json']['features']['lms'], $r['json'] );
check( 'plugin version header', false !== strpos( $r['headers'], 'x-yallapp-plugin-version' ) );
check( 'no-store header', false !== strpos( $r['headers'], 'no-store' ) );
$r = call( 'GET', '/home?platform=android' );
check( 'home 200 with sections', 200 === $r['status'] && isset( $r['json']['sections'] ), $r['raw'] );

echo "Sign-in\n";
$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => '12' ) );
check( 'short number rejected', 400 === $r['status'], $r['raw'] );
$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => '0' . $phone ) );
check( 'code requested', 200 === $r['status'] && ! empty( $r['json']['request_id'] ), $r['raw'] );
$request_id = $r['json']['request_id'] ?? '';
$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
check( 'resend cooldown 429', 429 === $r['status'], $r['raw'] );
$r = call( 'POST', '/auth/otp/verify', array( 'request_id' => $request_id, 'code' => '000000', 'device' => device( 'dev-a' ) ) );
check( 'wrong code 400', in_array( $r['status'], array( 400, 401 ), true ) && 'invalid_code' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/auth/otp/verify', array( 'request_id' => $request_id, 'code' => '123456', 'device' => device( 'dev-a' ) ) );
check( 'new number gets signup token', 200 === $r['status'] && ! empty( $r['json']['signup_token'] ), $r['raw'] );
$r = call( 'POST', '/auth/register', array( 'signup_token' => $r['json']['signup_token'] ?? '', 'name' => 'Deniz Kaya', 'device' => device( 'dev-a' ) ) );
check( 'register 201', 201 === $r['status'] && ! empty( $r['json']['access_token'] ), $r['raw'] );
$session = $r['json'];
$token   = $session['access_token'] ?? '';
check( 'user phone is E.164', '+90' . $phone === ( $session['user']['phone'] ?? '' ), $session['user'] ?? null );

$r = call( 'GET', '/me', null, $token );
check( 'me 200', 200 === $r['status'] && 'Deniz Kaya' === $r['json']['name'], $r['raw'] );
check( 'no gravatar', null === $r['json']['avatar_url'], $r['json'] );
$r = call( 'GET', '/me', null, 'not-a-token' );
check( 'bad token 401', 401 === $r['status'], $r['raw'] );
$r = call( 'PATCH', '/me', array( 'name' => 'Deniz K.', 'city' => 'Istanbul' ), $token );
check( 'update profile', 200 === $r['status'] && 'Deniz K.' === $r['json']['name'] && 'Istanbul' === $r['json']['city'], $r['raw'] );

$r = call( 'POST', '/auth/refresh', array( 'refresh_token' => $session['refresh_token'] ) );
check( 'refresh 200', 200 === $r['status'] && ! empty( $r['json']['refresh_token'] ), $r['raw'] );
$rotated = $r['json'];
$r       = call( 'POST', '/auth/refresh', array( 'refresh_token' => $session['refresh_token'] ) );
check( 'old refresh token rejected', 401 === $r['status'], $r['raw'] );
$token = $rotated['access_token'];

echo "Devices\n";
// The resend cooldown applies per number; clear it so more devices can sign in right away.
wp_cli( 'eval \'foreach ( array( "yallapp_cooldown_", "yallapp_rl_" ) as $p ) { global $wpdb; $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", "%" . $wpdb->esc_like( $p ) . "%" ) ); }\'' );
$b = sign_in( $phone, device( 'dev-b', 'ios' ) );
check( 'second device signs in', 200 === $b['status'], $b['raw'] );
wp_cli( 'eval \'foreach ( array( "yallapp_cooldown_", "yallapp_rl_" ) as $p ) { global $wpdb; $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", "%" . $wpdb->esc_like( $p ) . "%" ) ); }\'' );
$c = sign_in( $phone, device( 'dev-c' ) );
check( 'third device blocked', 403 === $c['status'] && 'device_limit_reached' === ( $c['json']['code'] ?? '' ), $c['raw'] );
$r = call( 'GET', '/me/devices', null, $token );
check( 'two devices listed', 200 === $r['status'] && 2 === count( $r['json']['items'] ) && 2 === $r['json']['limit'], $r['raw'] );
$current = array_values( array_filter( $r['json']['items'] ?? array(), function ( $d ) { return $d['current']; } ) );
check( 'current device flagged', 1 === count( $current ) && 'dev-a' === $current[0]['id'], $r['json'] );
$r = call( 'DELETE', '/me/devices/dev-b', null, $token );
check( 'remove device 204', 204 === $r['status'], $r['raw'] );
$r = call( 'GET', '/me', null, $b['json']['access_token'] ?? '' );
check( 'removed device signed out', 401 === $r['status'], $r['raw'] );
$r = call( 'PUT', '/me/push-token', array( 'token' => 'fcm-test-token', 'preferences' => array( 'new_lessons' => true ) ), $token );
check( 'push token saved', 204 === $r['status'], $r['raw'] );
// 36 Huawei phones without Google Play register a Push Kit token as "hms".
$push_user = (int) ( call( 'GET', '/me', null, $token )['json']['id'] ?? 0 );
$targets   = function () use ( $push_user ) {
	return json_decode( trim( (string) wp_cli( 'eval ' . escapeshellarg( 'echo wp_json_encode( Yallapp\Plugin::instance()->devices()->push_targets( array( ' . $push_user . ' ) ) );' ) ) ), true );
};
check( 'a token without a provider is Firebase', array( array( 'token' => 'fcm-test-token', 'provider' => 'fcm' ) ) === $targets(), $targets() );
$r = call( 'PUT', '/me/push-token', array( 'token' => 'hms-test-token', 'provider' => 'apns' ), $token );
check( 'unknown push provider refused', 400 === $r['status'] && 'invalid_request' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'PUT', '/me/push-token', array( 'token' => 'hms-test-token', 'provider' => 'hms', 'preferences' => array( 'new_lessons' => true ) ), $token );
check( 'Push Kit token saved', 204 === $r['status'], $r['raw'] );
check( 'Push Kit token stored as hms', array( array( 'token' => 'hms-test-token', 'provider' => 'hms' ) ) === $targets(), $targets() );
// It goes through Push Kit with the app ID and secret, never through Firebase (requests answered here).
$sent = json_decode(
	trim(
		(string) wp_cli(
			'eval ' . escapeshellarg(
				'$calls = array();'
				. ' add_filter( "pre_http_request", function ( $pre, $args, $url ) use ( &$calls ) { $calls[] = array( "url" => $url, "body" => $args["body"] ); $ok = false !== strpos( $url, "oauth-login" ) ? "{\"access_token\":\"hms-access\",\"expires_in\":3600}" : "{\"code\":\"80000000\",\"msg\":\"Success\"}"; return array( "headers" => array(), "body" => $ok, "response" => array( "code" => 200, "message" => "OK" ), "cookies" => array() ); }, 10, 3 );'
				. ' $settings = Yallapp\Plugin::instance()->settings(); $before = $settings->all();'
				. ' $settings->update( array( "huawei_push_app_id" => "104123456", "huawei_push_app_secret" => "app-secret-0123456789" ) );'
				. ' $stored = $settings->get( "huawei_push_app_secret" );'
				. ' $n = Yallapp\Plugin::instance()->push()->send_batch( array( ' . $push_user . ' ), "new_lessons", array( "title" => "New lesson", "body" => "Loops" ), array( "type" => "new_lesson", "lesson_id" => "7" ) );'
				. ' $settings->update( array( "huawei_push_app_id" => $before["huawei_push_app_id"], "huawei_push_app_secret" => $before["huawei_push_app_secret"] ) ); delete_transient( "yallapp_hms_access_token_" . md5( "104123456" ) );'
				. ' echo wp_json_encode( array( "sent" => $n, "encrypted" => 0 === strpos( $stored, "v1:" ), "calls" => $calls ) );'
			)
		)
	),
	true
);
$urls = array_column( $sent['calls'] ?? array(), 'url' );
check( 'Push Kit secret stored encrypted', true === ( $sent['encrypted'] ?? null ), $sent );
check( 'Push Kit token sent through Huawei', 1 === ( $sent['sent'] ?? 0 ) && array( 'https://oauth-login.cloud.huawei.com/oauth2/v3/token', 'https://push-api.cloud.huawei.com/v1/104123456/messages:send' ) === $urls, $sent );
$hms_body = json_decode( (string) ( $sent['calls'][1]['body'] ?? '' ), true );
check( 'Push Kit message carries the token and data', array( 'hms-test-token' ) === ( $hms_body['message']['token'] ?? null ) && '{"type":"new_lesson","lesson_id":"7"}' === ( $hms_body['message']['data'] ?? '' ), $hms_body );
$r = call( 'PUT', '/me/push-token', array( 'token' => 'fcm-test-token', 'preferences' => array( 'new_lessons' => true ) ), $token );
check( 'back to a Firebase token', 204 === $r['status'] && array( array( 'token' => 'fcm-test-token', 'provider' => 'fcm' ) ) === $targets(), $targets() );

echo "Catalog\n";
$r = call( 'GET', '/categories' );
check( 'categories', 200 === $r['status'] && is_array( $r['json']['items'] ), $r['raw'] );
$r = call( 'GET', '/courses?price=paid' );
check( 'paid filter', 200 === $r['status'] && 1 === $r['json']['total'] && $seed['design'] === $r['json']['items'][0]['id'], $r['raw'] );
$r = call( 'GET', '/courses?search=Python' );
check( 'search', 200 === $r['status'] && $seed['python'] === ( $r['json']['items'][0]['id'] ?? 0 ), $r['raw'] );
$r = call( 'GET', '/courses/' . $seed['design'] . '?platform=android', null, $token );
check( 'paid course on android: checkout', 200 === $r['status'] && 'checkout' === $r['json']['purchase']['action'], $r['raw'] );
check( 'has_checkout not exposed', ! array_key_exists( 'has_checkout', $r['json'] ?? array() ), $r['json'] );
$r = call( 'GET', '/courses/' . $seed['design'] . '?platform=ios', null, $token );
check( 'paid course on ios: none', 200 === $r['status'] && 'none' === $r['json']['purchase']['action'], $r['raw'] );
$r = call( 'GET', '/courses/' . $seed['python'] . '?platform=ios', null, $token );
check( 'free course on ios: enroll_free', 200 === $r['status'] && 'enroll_free' === $r['json']['purchase']['action'], $r['raw'] );
check(
	'course about: the lists beside the description',
	array(
		'learn'        => array( 'Write small programs', "Read other people's code" ),
		'requirements' => array( 'A computer' ),
		'audience'     => array( 'Beginners' ),
		'includes'     => array( '4 lessons', 'A quiz' ),
	) === ( $r['json']['about'] ?? null ) && is_int( $r['json']['student_count'] ?? null ),
	$r['json']
);
$r = call( 'GET', '/courses/999999?platform=android' );
check( 'missing course 404', 404 === $r['status'], $r['raw'] );
$r = call( 'GET', '/courses/' . $seed['design'] . '/curriculum', null, $token );
$items = array();
foreach ( $r['json']['topics'] ?? array() as $topic ) {
	foreach ( $topic['items'] as $item ) {
		$items[ $item['id'] ] = $item;
	}
}
check( 'preview lesson unlocked', isset( $items[ $seed['design_preview'] ] ) && false === $items[ $seed['design_preview'] ]['locked'], $r['json'] );
check( 'paid lesson locked', isset( $items[ $seed['design_locked'] ] ) && true === $items[ $seed['design_locked'] ]['locked'], $r['json'] );

echo "Purchases\n";
$r = call( 'POST', '/auth/checkout-link', array( 'platform' => 'ios', 'course_id' => $seed['design'] ), $token );
check( 'ios checkout 403', 403 === $r['status'] && 'purchase_not_allowed' === $r['json']['code'], $r['raw'] );
$r = call( 'POST', '/auth/checkout-link', array( 'platform' => 'android', 'course_id' => $seed['design'] ), $token );
check( 'android checkout link', 200 === $r['status'] && false !== strpos( $r['json']['url'] ?? '', 'yallapp_link=' ), $r['raw'] );
$link = $r['json']['url'] ?? '';
if ( $link ) {
	$m = call( 'GET', $link );
	check( 'magic link signs in and redirects', 302 === $m['status'] && false !== strpos( $m['headers'], 'wordpress_logged_in_' ), substr( $m['headers'], 0, 400 ) );
	$m = call( 'GET', $link );
	check( 'magic link is single use', false === strpos( $m['headers'], 'wordpress_logged_in_' ) );
}

echo "Learning\n";
$r = call( 'GET', '/lessons/' . $seed['lesson_html'], null, $token );
check( 'lesson before enrolling 403', 403 === $r['status'] && 'not_enrolled' === $r['json']['code'], $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['design_preview'] );
check( 'preview lesson opens signed out', 200 === $r['status'], $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['design_locked'] );
check( 'locked lesson signed out 401', 401 === $r['status'], $r['raw'] );
$r = call( 'POST', '/courses/' . $seed['python'] . '/enroll', array(), $token );
check( 'free enroll', in_array( $r['status'], array( 200, 201 ), true ), $r['raw'] );
$r = call( 'POST', '/courses/' . $seed['design'] . '/enroll', array(), $token );
check( 'paid course enroll refused', 403 === $r['status'], $r['raw'] );
$r = call( 'GET', '/me/courses', null, $token );
check( 'my courses lists python', 200 === $r['status'] && $seed['python'] === ( $r['json']['items'][0]['course']['id'] ?? 0 ), $r['raw'] );

$r = call( 'GET', '/lessons/' . $seed['lesson_html'], null, $token );
check( 'html lesson native', 200 === $r['status'] && 'native' === $r['json']['render_mode'], $r['raw'] );
$html   = (string) ( $r['json']['html'] ?? '' );
$embeds = $r['json']['embeds'] ?? array();
check( 'bookmark span removed', false === strpos( $html, 'mce_SELRES' ) && false === strpos( $html, 'data-mce-type' ), $html );
check( 'iframes became placeholders', false === stripos( $html, '<iframe' ) && 2 === substr_count( $html, 'data-yallapp-embed=' ), $html );
$by = array();
foreach ( $embeds as $embed ) {
	$by[ $embed['provider'] ] = $embed;
}
check( 'youtube embed 16:9', isset( $by['youtube'] ) && abs( $by['youtube']['aspect_ratio'] - 16 / 9 ) < 0.01, $embeds );
check( 'other embed keeps height 900', isset( $by['other'] ) && '900' === $by['other']['height'], $embeds );
check( 'code block kept', false !== strpos( $html, '<pre' ), $html );

$r = call( 'GET', '/lessons/' . $seed['lesson_script'], null, $token );
check( 'script lesson uses web view', 200 === $r['status'] && 'webview' === $r['json']['render_mode'] && false !== strpos( (string) $r['json']['webview_url'], 'yallapp_link=' ), $r['raw'] );

$r = call( 'GET', '/lessons/' . $seed['lesson_video'], null, $token );
check( 'video lesson signed url', 200 === $r['status'] && 'upload' === $r['json']['video']['source'] && false !== strpos( (string) $r['json']['video']['url'], 'sig=' ), $r['raw'] );
$video = (string) ( $r['json']['video']['url'] ?? '' );
if ( $video ) {
	$m = call( 'GET', $video, null, null, array( 'Range: bytes=0-9' ) );
	check( 'video range 206', 206 === $m['status'] && 10 === strlen( $m['raw'] ), $m['status'] . ' ' . strlen( $m['raw'] ) );
	$m = call( 'GET', preg_replace( '/sig=[^&]+/', 'sig=bad', $video ) );
	check( 'tampered video link 403', 403 === $m['status'], $m['status'] );
}

$r = call( 'PUT', '/lessons/' . $seed['lesson_video'] . '/progress', array( 'position_seconds' => 42, 'watched_percent' => 30 ), $token );
check( 'progress saved', 204 === $r['status'], $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['lesson_video'], null, $token );
check( 'position restored', 42 === ( $r['json']['position_seconds'] ?? 0 ), $r['json'] );
$r = call( 'POST', '/lessons/' . $seed['lesson_html'] . '/complete', array(), $token );
check( 'complete lesson returns progress', 200 === $r['status'] && ( $r['json']['completed_items'] ?? 0 ) >= 1, $r['status'] . ' ' . $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['lesson_html'], null, $token );
check( 'lesson marked complete', true === ( $r['json']['completed'] ?? null ), $r['json'] );

echo "Wishlist\n";
$r = call( 'PUT', '/me/wishlist/' . $seed['design'], array(), $token );
check( 'wishlist add', 204 === $r['status'], $r['raw'] );
$r = call( 'GET', '/me/wishlist', null, $token );
check( 'wishlist lists course', 200 === $r['status'] && $seed['design'] === ( $r['json']['items'][0]['id'] ?? 0 ), $r['raw'] );
$r = call( 'DELETE', '/me/wishlist/' . $seed['design'], null, $token );
$l = call( 'GET', '/me/wishlist', null, $token );
check( 'wishlist remove', 204 === $r['status'] && 0 === count( $l['json']['items'] ?? array( 1 ) ), $l['raw'] );

echo "Pages\n";
require_once __DIR__ . '/pages-helpers.php';
$r = call( 'GET', '/pages?platform=android' );
check_navigation_shape( 'default pages: navigation shape', $r['json'] );
check( 'default pages: academy tabs', array( 'home', 'courses', 'my-courses', 'account' ) === array_column( $r['json']['tabs'] ?? array(), 'id' ) && 'my_courses' === ( $r['json']['tabs'][2]['target']['screen'] ?? '' ), $r['json'] );
check( 'default pages: "My courses" as the app and the dashboard write it (38)', 'My courses' === ( $r['json']['tabs'][2]['label'] ?? '' ), $r['json']['tabs'] ?? null );
check( 'default pages: version is the ETag', 0 === strpos( (string) ( $r['json']['version'] ?? '' ), 'default.' ) && strtolower( '"' . $r['json']['version'] . '"' ) === header_value( $r, 'etag' ), $r['headers'] );
check( 'pages vary by language', false !== strpos( $r['headers'], 'vary: accept-language' ), $r['headers'] );
$r = call( 'GET', '/pages?platform=android', null, null, array( 'If-None-Match: "' . ( $r['json']['version'] ?? '' ) . '"' ) );
check( 'default pages: If-None-Match 304', 304 === $r['status'] && '' === $r['raw'], $r['status'] . ' ' . $r['raw'] );
$r = call( 'GET', '/pages?platform=android', null, null, array( 'If-None-Match: other' ) );
check( 'default pages: other version 200', 200 === $r['status'], $r['status'] );
$r = call( 'GET', '/pages/home?platform=android' );
$home = $r['json'];
check( 'default home 200', 200 === $r['status'] && 'home' === ( $home['slug'] ?? '' ) && false === ( $home['show_title'] ?? null ), $r['raw'] );
check( 'default home: search, categories and courses', 'courses' === ( page_block( $home, 'search' )['source'] ?? '' ) && ! empty( page_block( $home, 'categories' )['categories'] ) && 3 === count( page_block( $home, 'latest-courses' )['items'] ?? array() ), page_block_ids( $home ) );
check_item_shapes( 'default home: item shapes', $home );
check( 'default home: course item opens the course', array( 'type' => 'course', 'course_id' => $seed['english'] ) === ( page_block( $home, 'latest-courses' )['items'][0]['action'] ?? null ), page_block( $home, 'latest-courses' ) );
check( 'default home: no continue learning signed out', null === page_block( $home, 'continue-learning' ), page_block_ids( $home ) );
$r = call( 'GET', '/pages/home?platform=android', null, $token );
$continue = page_block( $r['json'], 'continue-learning' );
check( 'default home: continue learning signed in', $seed['python'] === ( $continue['course']['course']['id'] ?? 0 ) && isset( $continue['course']['progress']['percent'] ), page_block_ids( $r['json'] ) );
set_settings( array( 'featured_course_ids' => array( $seed['design'] ) ) );
$r = call( 'GET', '/pages/home?platform=android' );
check( 'default home: featured courses from the settings', array( (string) $seed['design'] ) === block_item_ids( page_block( $r['json'], 'featured-courses' ) ) && null === page_block( $r['json'], 'latest-courses' ), page_block_ids( $r['json'] ) );
set_settings( array( 'featured_course_ids' => array() ) );
// 30 The default pages follow the type of the app asking, whatever plugins the site has.
$r = call( 'GET', '/pages?platform=android&app_type=store' );
check( 'default pages for a Store app: store tabs', array( 'home', 'shop', 'cart', 'account' ) === array_column( $r['json']['tabs'] ?? array(), 'id' ), $r['json'] );
$r = call( 'GET', '/pages/home?platform=android&app_type=store' );
check( 'default home for a Store app: no course lists', ! in_array( 'courses', array_column( $r['json']['blocks'] ?? array(), 'source' ), true ), $r['json'] );
$r = call( 'GET', '/pages?platform=android&app_type=lms' );
check( 'default pages for an Academy app: academy tabs', array( 'home', 'courses', 'my-courses', 'account' ) === array_column( $r['json']['tabs'] ?? array(), 'id' ), $r['json'] );
$r = call( 'GET', '/pages?platform=android&app_type=hovercraft' );
check( 'an unknown app type is ignored', 200 === $r['status'] && array( 'home', 'courses', 'my-courses', 'account' ) === array_column( $r['json']['tabs'] ?? array(), 'id' ), $r['raw'] );
$r = call( 'GET', '/pages/missing?platform=android' );
check( 'unknown page 404', 404 === $r['status'] && 'not_found' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/pages/Not_A_Slug?platform=android' );
check( 'bad slug 400', 400 === $r['status'], $r['raw'] );
$r = call( 'GET', '/pages' );
check( 'platform required 400', 400 === $r['status'], $r['raw'] );
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config: English only, no look without a layout', array( 'default' => 'en', 'available' => array( 'en' ) ) === ( $r['json']['languages'] ?? null ) && ! array_key_exists( 'appearance', $r['json'] ?? array() ), $r['json'] );

$languages = 0;
foreach ( call( 'GET', '/categories' )['json']['items'] ?? array() as $category ) {
	if ( 'Languages' === $category['name'] ) {
		$languages = $category['id'];
	}
}
$layout = array(
	'version'    => '2026-10-13T18:00:00Z.4',
	'appearance' => array( 'template' => 'bold', 'theme_mode' => 'dark', 'user_can_change_mode' => true, 'secondary_color' => '#e8b04b', 'font' => 'Outfit', 'corners' => 'round', 'cards' => 'elevated' ),
	'languages'  => array( 'default' => 'en', 'available' => array( 'en', 'ar' ) ),
	'tabs'       => array(
		array( 'id' => 'home', 'label' => 'Home', 'icon' => 'home', 'target' => array( 'type' => 'page', 'page_slug' => 'home' ), 'translations' => array( 'ar' => array( 'label' => 'الرئيسية' ) ) ),
		array( 'id' => 'offers', 'label' => 'Offers', 'icon' => 'sell', 'target' => array( 'type' => 'page', 'page_slug' => 'offers' ) ),
		array( 'id' => 'homes', 'label' => 'Homes', 'icon' => 'home_work', 'target' => array( 'type' => 'item', 'item' => array( 'source' => 'listings', 'id' => '1' ) ) ),
		array( 'id' => 'account', 'label' => 'Account', 'icon' => 'person', 'target' => array( 'type' => 'screen', 'screen' => 'account' ) ),
	),
	'pages'      => array(
		array(
			'slug'         => 'home',
			'title'        => 'Welcome',
			'show_title'   => true,
			'updated_at'   => '2026-10-13T18:00:00Z',
			'translations' => array( 'ar' => array( 'title' => 'أهلا وسهلا' ) ),
			'blocks'       => array(
				array( 'id' => 'hero', 'type' => 'banner', 'visibility' => 'everyone', 'image_url' => 'https://example.org/hero.jpg', 'heading' => 'Learn faster', 'subheading' => 'New courses every week', 'action' => array( 'type' => 'course', 'course_id' => $seed['design'] ), 'translations' => array( 'ar' => array( 'heading' => 'تعلم أسرع' ) ) ),
				array( 'id' => 'intro', 'type' => 'text', 'visibility' => 'everyone', 'html' => '<p onclick="steal()">Hello <strong>students</strong></p><script>alert(1)</script>', 'translations' => array( 'ar' => array( 'html' => '<p>مرحبا</p>' ) ) ),
				array( 'id' => 'find', 'type' => 'search', 'visibility' => 'everyone', 'source' => 'courses', 'placeholder' => 'Find a course', 'translations' => array( 'ar' => array( 'placeholder' => 'ابحث عن دورة' ) ) ),
				array( 'id' => 'picked', 'type' => 'items', 'visibility' => 'everyone', 'title' => 'Picked for you', 'source' => 'courses', 'layout' => 'grid', 'query' => array( 'ids' => array( (string) $seed['design'], (string) $seed['python'] ), 'category_id' => (string) $languages, 'limit' => 5 ), 'see_all' => array( 'type' => 'screen', 'screen' => 'courses' ) ),
				array( 'id' => 'languages', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'courses', 'layout' => 'list', 'query' => array( 'category_id' => (string) $languages, 'limit' => 10 ) ),
				array( 'id' => 'newest', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'courses', 'layout' => 'carousel', 'query' => array( 'sort' => 'newest', 'limit' => 1 ) ),
				array( 'id' => 'featured', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'courses', 'layout' => 'carousel', 'query' => array( 'featured' => true, 'limit' => 5 ) ),
				array( 'id' => 'news', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'posts', 'layout' => 'list', 'query' => array( 'limit' => 5 ) ),
				array( 'id' => 'cats', 'type' => 'categories', 'visibility' => 'everyone', 'source' => 'courses', 'style' => 'tiles' ),
				array( 'id' => 'continue', 'type' => 'continue_learning', 'visibility' => 'signed_in', 'title' => 'Continue learning' ),
				array( 'id' => 'join', 'type' => 'button', 'visibility' => 'signed_out', 'label' => 'Sign in', 'style' => 'filled', 'icon' => 'login', 'action' => array( 'type' => 'screen', 'screen' => 'account' ) ),
				array( 'id' => 'members', 'type' => 'text', 'visibility' => 'signed_in', 'html' => '<p>Members only</p>' ),
				array( 'id' => 'homes', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'listings', 'layout' => 'grid', 'query' => array( 'limit' => 6 ) ),
				array( 'id' => 'shop', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'products', 'layout' => 'grid', 'query' => array( 'limit' => 6 ) ),
				array( 'id' => 'salon', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'services', 'layout' => 'grid', 'query' => array( 'limit' => 6 ) ),
				array( 'id' => 'find-home', 'type' => 'search', 'visibility' => 'everyone', 'source' => 'listings', 'placeholder' => 'Search properties' ),
				array( 'id' => 'map', 'type' => 'map', 'visibility' => 'everyone' ),
				array( 'id' => 'no-image', 'type' => 'banner', 'visibility' => 'everyone', 'image_url' => 'javascript:alert(1)' ),
				array( 'id' => 'listing-button', 'type' => 'button', 'visibility' => 'everyone', 'label' => 'See homes', 'style' => 'filled', 'action' => array( 'type' => 'item', 'item' => array( 'source' => 'listings', 'id' => '4' ) ) ),
				array( 'id' => 'hidden', 'type' => 'spacer', 'visibility' => 'admins', 'size' => 'large' ),
				array( 'id' => 'gap', 'type' => 'spacer', 'visibility' => 'everyone', 'size' => 'large' ),
				array( 'id' => 'tour', 'type' => 'embed', 'visibility' => 'everyone', 'url' => 'https://www.youtube.com/embed/abc', 'height' => 300 ),
				// 33 Blocks whose content the owner writes.
				array( 'id' => 'slides', 'type' => 'slider', 'visibility' => 'everyone', 'auto_advance' => false, 'slides' => array( array( 'heading' => 'Autumn intake', 'action' => array( 'type' => 'screen', 'screen' => 'courses' ), 'translations' => array( 'ar' => array( 'heading' => 'التسجيل مفتوح' ) ) ), array( 'image_url' => 'https://example.org/s.jpg', 'action' => array( 'type' => 'item', 'item' => array( 'source' => 'listings', 'id' => '1' ) ) ) ) ),
				array( 'id' => 'links', 'type' => 'quick_links', 'visibility' => 'everyone', 'style' => 'row', 'links' => array( array( 'icon' => 'school', 'label' => 'Courses', 'action' => array( 'type' => 'screen', 'screen' => 'courses' ), 'translations' => array( 'ar' => array( 'label' => 'الدورات' ) ) ), array( 'icon' => 'home', 'label' => 'Homes', 'action' => array( 'type' => 'item', 'item' => array( 'source' => 'listings', 'id' => '1' ) ) ) ) ),
				array( 'id' => 'quotes', 'type' => 'testimonials', 'visibility' => 'everyone', 'quotes' => array( array( 'text' => 'Great teachers.', 'name' => 'Leyla', 'rating' => 5 ) ) ),
				array( 'id' => 'questions', 'type' => 'faq', 'visibility' => 'everyone', 'questions' => array( array( 'question' => 'How do I start?', 'answer' => "Enroll.\nThen learn.", 'translations' => array( 'ar' => array( 'question' => 'كيف أبدأ؟' ) ) ) ) ),
				array( 'id' => 'soon', 'type' => 'countdown', 'visibility' => 'everyone', 'heading' => 'Term starts in', 'ends_at' => '2099-01-01T00:00:00Z', 'label' => 'See courses', 'action' => array( 'type' => 'screen', 'screen' => 'courses' ) ),
				array( 'id' => 'over', 'type' => 'countdown', 'visibility' => 'everyone', 'heading' => 'Ended', 'ends_at' => '2020-01-01T00:00:00Z' ),
				array( 'id' => 'reach', 'type' => 'contact', 'visibility' => 'everyone', 'phone' => '+20 100 123 4567', 'email' => 'hi@example.org', 'address' => '12 Road 9, Maadi', 'translations' => array( 'ar' => array( 'address' => 'المعادي' ) ) ),
				array( 'id' => 'open', 'type' => 'hours', 'visibility' => 'everyone', 'hours' => array( array( 'day' => 'sat', 'opens' => '10:00', 'closes' => '14:00' ), array( 'day' => 'mon', 'opens' => '09:00', 'closes' => '17:00' ) ), 'note' => 'Closed on holidays.' ),
				array( 'id' => 'follow', 'type' => 'social', 'visibility' => 'everyone', 'profiles' => array( array( 'network' => 'instagram', 'url' => 'https://instagram.com/academy' ) ) ),
				array( 'id' => 'teachers', 'type' => 'team', 'visibility' => 'everyone', 'people' => array( array( 'name' => 'Ayse Demir', 'role' => 'Teacher', 'translations' => array( 'ar' => array( 'role' => 'معلمة' ) ) ) ) ),
				array( 'id' => 'numbers', 'type' => 'stats', 'visibility' => 'everyone', 'stats' => array( array( 'value' => '12k+', 'label' => 'Students' ), array( 'value' => '40', 'label' => 'Courses' ) ) ),
				array( 'id' => 'news-bar', 'type' => 'notice', 'visibility' => 'everyone', 'tone' => 'success', 'text' => 'Enrollment is open.', 'translations' => array( 'ar' => array( 'text' => 'التسجيل مفتوح.' ) ) ),
			),
		),
		array(
			'slug'       => 'offers',
			'title'      => 'Offers',
			'show_title' => false,
			'updated_at' => '2026-10-12T09:30:00Z',
			'blocks'     => array(
				array( 'id' => 'deal', 'type' => 'image', 'visibility' => 'everyone', 'image_url' => 'https://example.org/deal.png', 'aspect_ratio' => 2, 'action' => array( 'type' => 'url', 'url' => 'https://example.org/deal' ) ),
				array( 'id' => 'clip', 'type' => 'video', 'visibility' => 'everyone', 'url' => 'https://example.org/clip.mp4' ),
			),
		),
	),
);
store_layout( $layout );

$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config: published look', array( 'template' => 'bold', 'theme_mode' => 'dark', 'user_can_change_mode' => true, 'secondary_color' => '#E8B04B', 'font' => 'Outfit', 'corners' => 'round', 'cards' => 'elevated' ) === ( $r['json']['appearance'] ?? null ), $r['json']['appearance'] ?? null );
check( 'config: published languages', array( 'default' => 'en', 'available' => array( 'en', 'ar' ) ) === ( $r['json']['languages'] ?? null ), $r['json']['languages'] ?? null );
$r = call( 'GET', '/pages?platform=android' );
check_navigation_shape( 'published pages: navigation shape', $r['json'] );
check( 'published pages: version and ETag', '2026-10-13T18:00:00Z.4' === ( $r['json']['version'] ?? '' ) && '"2026-10-13t18:00:00z.4"' === header_value( $r, 'etag' ), $r['headers'] );
check( 'published pages: tab the site cannot open is dropped', array( 'home', 'offers', 'account' ) === array_column( $r['json']['tabs'] ?? array(), 'id' ), $r['json']['tabs'] ?? null );
check( 'published pages: page list', array( 'home', 'offers' ) === array_column( $r['json']['pages'] ?? array(), 'slug' ) && 'Welcome' === $r['json']['pages'][0]['title'] && '2026-10-12T09:30:00Z' === $r['json']['pages'][1]['updated_at'], $r['json']['pages'] ?? null );
$r = call( 'GET', '/pages?platform=android', null, null, array( 'If-None-Match: 2026-10-13T18:00:00Z.4' ) );
check( 'published pages: If-None-Match 304', 304 === $r['status'], $r['status'] );
$r = call( 'GET', '/pages?platform=android', null, null, array( 'Accept-Language: ar-EG,ar;q=0.9,en;q=0.8' ) );
check( 'arabic tabs, English fallback', 'الرئيسية' === ( $r['json']['tabs'][0]['label'] ?? '' ) && 'Offers' === ( $r['json']['tabs'][1]['label'] ?? '' ) && 'أهلا وسهلا' === ( $r['json']['pages'][0]['title'] ?? '' ), $r['json'] );
check( 'arabic version differs', '2026-10-13T18:00:00Z.4.ar' === ( $r['json']['version'] ?? '' ), $r['json']['version'] ?? null );
$r = call( 'GET', '/pages?platform=android', null, null, array( 'Accept-Language: ar', 'If-None-Match: "2026-10-13T18:00:00Z.4"' ) );
check( 'english copy not reused for arabic', 200 === $r['status'], $r['status'] );
$r = call( 'GET', '/pages?platform=android', null, null, array( 'Accept-Language: fr-FR, tr;q=0.5' ) );
check( 'language not turned on falls back to default', 'Home' === ( $r['json']['tabs'][0]['label'] ?? '' ) && '2026-10-13T18:00:00Z.4' === ( $r['json']['version'] ?? '' ), $r['json']['tabs'] ?? null );

$r    = call( 'GET', '/pages/home?platform=android', null, null, array( 'Accept-Language: ar' ) );
$page = $r['json'];
check( 'arabic page title', 200 === $r['status'] && 'أهلا وسهلا' === ( $page['title'] ?? '' ) && true === ( $page['show_title'] ?? null ), $r['raw'] );
$hero = page_block( $page, 'hero' );
check( 'arabic banner heading, English subheading', 'تعلم أسرع' === ( $hero['heading'] ?? '' ) && 'New courses every week' === ( $hero['subheading'] ?? '' ) && array( 'type' => 'course', 'course_id' => $seed['design'] ) === ( $hero['action'] ?? null ), $hero );
check( 'arabic text block', '<p>مرحبا</p>' === ( page_block( $page, 'intro' )['html'] ?? '' ), page_block( $page, 'intro' ) );
check( 'arabic search placeholder', 'ابحث عن دورة' === ( page_block( $page, 'find' )['placeholder'] ?? '' ), page_block( $page, 'find' ) );
check( 'texts without a translation stay English', 'Picked for you' === ( page_block( $page, 'picked' )['title'] ?? '' ), page_block( $page, 'picked' ) );
check( 'translations are not sent', false === strpos( $r['raw'], 'translations' ) && false === strpos( $r['raw'], '"query"' ) && false === strpos( $r['raw'], 'visibility' ), $r['raw'] );
// 33 The entries of the new blocks come in Arabic too.
check( 'arabic slide, quick link, question, role and notice', 'التسجيل مفتوح' === ( page_block( $page, 'slides' )['slides'][0]['heading'] ?? '' ) && 'الدورات' === ( page_block( $page, 'links' )['links'][0]['label'] ?? '' ) && 'كيف أبدأ؟' === ( page_block( $page, 'questions' )['questions'][0]['question'] ?? '' ) && "Enroll.\nThen learn." === ( page_block( $page, 'questions' )['questions'][0]['answer'] ?? '' ) && 'معلمة' === ( page_block( $page, 'teachers' )['people'][0]['role'] ?? '' ) && 'التسجيل مفتوح.' === ( page_block( $page, 'news-bar' )['text'] ?? '' ) && 'المعادي' === ( page_block( $page, 'reach' )['address'] ?? '' ), $page );

$r    = call( 'GET', '/pages/home?platform=android' );
$page = $r['json'];
$html = (string) ( page_block( $page, 'intro' )['html'] ?? '' );
check( 'text html cleaned like lessons', false !== strpos( $html, '<strong>students</strong>' ) && false === stripos( $html, 'script' ) && false === stripos( $html, 'onclick' ), $html );
check( 'signed out: sign-in button, no member blocks', null !== page_block( $page, 'join' ) && null === page_block( $page, 'members' ) && null === page_block( $page, 'continue' ), page_block_ids( $page ) );
check( 'unsupported blocks dropped', array() === array_values( array_intersect( array( 'homes', 'shop', 'salon', 'find-home', 'map', 'no-image', 'listing-button', 'hidden' ), page_block_ids( $page ) ) ), page_block_ids( $page ) );
check( 'blocks keep their order', array( 'hero', 'intro', 'find', 'picked', 'languages', 'newest', 'news', 'cats', 'join', 'gap', 'tour', 'slides', 'links', 'quotes', 'questions', 'soon', 'reach', 'open', 'follow', 'teachers', 'numbers', 'news-bar' ) === page_block_ids( $page ), page_block_ids( $page ) );
// 33 The new blocks come back checked: what the site can't open is left out, an ended countdown goes.
$slides = page_block( $page, 'slides' );
check( 'slider: slides, without an action the site cannot follow', false === ( $slides['auto_advance'] ?? null ) && 2 === count( $slides['slides'] ?? array() ) && array( 'type' => 'screen', 'screen' => 'courses' ) === ( $slides['slides'][0]['action'] ?? null ) && ! isset( $slides['slides'][1]['action'] ) && 'https://example.org/s.jpg' === ( $slides['slides'][1]['image_url'] ?? '' ), $slides );
check( 'quick links: tiles the site cannot open are dropped', 'row' === ( page_block( $page, 'links' )['style'] ?? '' ) && array( 'Courses' ) === array_column( page_block( $page, 'links' )['links'] ?? array(), 'label' ), page_block( $page, 'links' ) );
check( 'testimonials and countdown', 5 === ( page_block( $page, 'quotes' )['quotes'][0]['rating'] ?? 0 ) && '2099-01-01T00:00:00Z' === ( page_block( $page, 'soon' )['ends_at'] ?? '' ) && 'See courses' === ( page_block( $page, 'soon' )['label'] ?? '' ) && null === page_block( $page, 'over' ), $page );
check( 'contact, hours, social, team, numbers, notice', '+20 100 123 4567' === ( page_block( $page, 'reach' )['phone'] ?? '' ) && array_key_exists( 'website', page_block( $page, 'reach' ) ?? array() ) && null === page_block( $page, 'reach' )['website'] && array( 'mon', 'sat' ) === array_column( page_block( $page, 'open' )['hours'] ?? array(), 'day' ) && 'instagram' === ( page_block( $page, 'follow' )['profiles'][0]['network'] ?? '' ) && 'Ayse Demir' === ( page_block( $page, 'teachers' )['people'][0]['name'] ?? '' ) && 'carousel' === ( page_block( $page, 'teachers' )['layout'] ?? '' ) && 2 === count( page_block( $page, 'numbers' )['stats'] ?? array() ) && 'success' === ( page_block( $page, 'news-bar' )['tone'] ?? '' ), $page );
check_item_shapes( 'published home: item shapes', $page );
$picked = page_block( $page, 'picked' );
check( 'hand-picked courses in their order, other filters ignored', array( (string) $seed['design'], (string) $seed['python'] ) === block_item_ids( $picked ) && 'grid' === $picked['layout'] && array( 'type' => 'screen', 'screen' => 'courses' ) === ( $picked['see_all'] ?? null ), $picked );
check( 'course item shape', 'Python Programming Basics' === ( $picked['items'][1]['title'] ?? '' ) && 'Free' === ( $picked['items'][1]['price_label'] ?? '' ) && false === ( $picked['items'][1]['favorited'] ?? null ) && 'Ayse Demir' === ( $picked['items'][1]['subtitle'] ?? '' ), $picked['items'] ?? null );
check( 'category filter', array( (string) $seed['english'] ) === block_item_ids( page_block( $page, 'languages' ) ), page_block( $page, 'languages' ) );
check( 'limit', 1 === count( page_block( $page, 'newest' )['items'] ?? array() ), page_block( $page, 'newest' ) );
check( 'featured without featured courses is dropped', null === page_block( $page, 'featured' ), page_block_ids( $page ) );
$news = page_block( $page, 'news' );
check( 'posts open on the website', 'posts' === ( $news['items'][0]['source'] ?? '' ) && 'url' === ( $news['items'][0]['action']['type'] ?? '' ) && 0 === strpos( (string) ( $news['items'][0]['action']['url'] ?? '' ), 'http' ), $news );
$cats = page_block( $page, 'cats' );
check( 'categories block', 'tiles' === ( $cats['style'] ?? '' ) && 2 === count( $cats['categories'] ?? array() ) && array( 'id', 'name', 'count' ) === array_keys( $cats['categories'][0] ), $cats );
check( 'spacer and embed', 'large' === ( page_block( $page, 'gap' )['size'] ?? '' ) && 300 === ( page_block( $page, 'tour' )['height'] ?? 0 ), $page );

set_settings( array( 'featured_course_ids' => array( $seed['python'] ) ) );
call( 'PUT', '/me/wishlist/' . $seed['design'], array(), $token );
$r    = call( 'GET', '/pages/home?platform=android', null, $token );
$page = $r['json'];
check( 'signed in: member blocks, no sign-in button', null === page_block( $page, 'join' ) && null !== page_block( $page, 'members' ), page_block_ids( $page ) );
check( 'signed in: continue learning', $seed['python'] === ( page_block( $page, 'continue' )['course']['course']['id'] ?? 0 ) && 'Continue learning' === ( page_block( $page, 'continue' )['title'] ?? '' ), page_block( $page, 'continue' ) );
check( 'featured courses', array( (string) $seed['python'] ) === block_item_ids( page_block( $page, 'featured' ) ), page_block( $page, 'featured' ) );
check( 'wishlisted course is favorited', true === ( page_block( $page, 'picked' )['items'][0]['favorited'] ?? null ), page_block( $page, 'picked' ) );
call( 'DELETE', '/me/wishlist/' . $seed['design'], null, $token );
set_settings( array( 'featured_course_ids' => array() ) );

$r = call( 'GET', '/pages/offers?platform=ios' );
check( 'second page', 200 === $r['status'] && false === $r['json']['show_title'] && 2.0 === (float) ( page_block( $r['json'], 'deal' )['aspect_ratio'] ?? 0 ) && 'https://example.org/deal' === ( page_block( $r['json'], 'deal' )['action']['url'] ?? '' ) && 'https://example.org/clip.mp4' === ( page_block( $r['json'], 'clip' )['url'] ?? '' ), $r['raw'] );
forget_layout();
$r = call( 'GET', '/pages?platform=android' );
check( 'default pages again without a layout', 0 === strpos( (string) ( $r['json']['version'] ?? '' ), 'default.' ), $r['json'] );

echo "Quiz\n";
$r = call( 'GET', '/quizzes/' . $seed['quiz'], null, $token );
check( 'quiz details', 200 === $r['status'] && 60 === (int) ( $r['json']['pass_percent'] ?? 0 ), $r['raw'] );
$r = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts', array(), $token );
check( 'attempt started', 201 === $r['status'] && ! empty( $r['json']['id'] ) && 3 === count( $r['json']['questions'] ), $r['raw'] );
$attempt = $r['json'];
$answers = array();
foreach ( $attempt['questions'] ?? array() as $q ) {
	$correct = array_values(
		array_map(
			function ( $o ) { return $o['id']; },
			array_filter( $q['options'], function ( $o ) { return in_array( $o['label'], array( 'True', 'def', 'list', 'dict' ), true ); } )
		)
	);
	$answers[] = array( 'question_id' => $q['id'], 'option_ids' => $correct );
}
$r = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts/' . ( $attempt['id'] ?? 0 ) . '/submit', array( 'answers' => $answers ), $token );
check( 'quiz graded', 200 === $r['status'] && isset( $r['json']['status'] ), $r['raw'] );
check( 'quiz passed with correct answers', 'passed' === ( $r['json']['status'] ?? '' ) && 100.0 === (float) $r['json']['score_percent'], $r['json'] );
$r = call( 'GET', '/me/quiz-attempts', null, $token );
check( 'attempt history', 200 === $r['status'] && $r['json']['total'] >= 1, $r['raw'] );

echo "Notifications\n";
/**
 * Runs PHP in the dev site and returns what it echoes.
 */
function wp_eval( $php ) {
	return trim( (string) wp_cli( 'eval ' . escapeshellarg( $php ) ) );
}
$me_id = (int) ( call( 'GET', '/me', null, $token )['json']['id'] ?? 0 );
$r = call( 'GET', '/me/notifications', null, $token );
check( 'enrollment notification in the inbox', 200 === $r['status'] && 'enrolled' === ( $r['json']['items'][0]['type'] ?? '' ) && $seed['python'] === ( $r['json']['items'][0]['course_id'] ?? 0 ), $r['raw'] );
$topic = (int) wp_eval( 'echo wp_get_post_parent_id( ' . (int) $seed['lesson_html'] . ' );' );
$new_lesson = (int) wp_eval( 'echo wp_insert_post( array( "post_type" => tutor()->lesson_post_type, "post_status" => "publish", "post_title" => "Loops", "post_parent" => ' . $topic . ' ) );' );
wp_eval( 'Yallapp\Plugin::instance()->push()->announce( "Exam on Friday", "Bring a pencil.", 0 );' );
wp_eval( 'Yallapp\Plugin::instance()->push()->announce( "Design only", "Not for Python students.", ' . (int) $seed['design'] . ' );' );
$r = call( 'GET', '/me/notifications', null, $token );
$types = array_map( function ( $n ) { return $n['type']; }, $r['json']['items'] ?? array() );
check( 'inbox has announcement, new lesson and enrollment, newest first', array( 'announcement', 'new_lesson', 'enrolled' ) === $types, $r['raw'] );
check( 'new lesson notification opens the lesson', $new_lesson === ( $r['json']['items'][1]['lesson_id'] ?? 0 ), $r['json']['items'] ?? null );
check( 'all unread', 3 === ( $r['json']['unread_count'] ?? -1 ) && false === ( $r['json']['items'][0]['read'] ?? null ), $r['json'] );
$r = call( 'GET', '/me/notifications?per_page=1', null, $token );
check( 'inbox pages', 3 === ( $r['json']['total'] ?? 0 ) && 3 === ( $r['json']['total_pages'] ?? 0 ) && 1 === count( $r['json']['items'] ?? array() ), $r['raw'] );
$r = call( 'POST', '/me/notifications/read', array(), $token );
check( 'mark read 204', 204 === $r['status'], $r['raw'] );
$r = call( 'GET', '/me/notifications', null, $token );
check( 'all read after marking', 0 === ( $r['json']['unread_count'] ?? -1 ) && true === ( $r['json']['items'][2]['read'] ?? null ), $r['json'] );
$r = call( 'GET', '/me/notifications' );
check( 'inbox needs sign-in', 401 === $r['status'], $r['raw'] );

echo "Orders\n";
$r = call( 'GET', '/me/orders', null, $token );
check( 'no orders without a checkout', 200 === $r['status'] && 0 === $r['json']['total'], $r['raw'] );
wp_eval( 'tutor_utils()->update_option( "monetize_by", "tutor" );' );
$order = (int) wp_eval(
	'global $wpdb; $now = gmdate( "Y-m-d H:i:s" );'
	. ' $wpdb->insert( $wpdb->prefix . "tutor_orders", array( "user_id" => ' . $me_id . ', "order_type" => "single_order", "order_status" => "completed", "payment_status" => "paid", "subtotal_price" => 450, "pre_tax_price" => 450, "total_price" => 450, "net_payment" => 450, "created_at_gmt" => $now, "created_by" => ' . $me_id . ', "updated_by" => ' . $me_id . ' ) );'
	. ' $id = $wpdb->insert_id; $wpdb->insert( $wpdb->prefix . "tutor_order_items", array( "order_id" => $id, "item_id" => ' . (int) $seed['design'] . ', "regular_price" => 450 ) ); echo $id;'
);
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config says the site sells courses', true === ( $r['json']['features']['orders'] ?? null ), $r['json']['features'] ?? null );
$r = call( 'GET', '/me/orders', null, $token );
$o = $r['json']['items'][0] ?? array();
check( 'order listed', 200 === $r['status'] && 1 === $r['json']['total'] && $order === ( $o['id'] ?? 0 ), $r['raw'] );
check( 'order shape', 'completed' === ( $o['status'] ?? '' ) && '' !== ( $o['status_label'] ?? '' ) && false !== strpos( (string) ( $o['total'] ?? '' ), '450' ) && false === strpos( (string) ( $o['total'] ?? '' ), '<' ), $o );
check( 'order item links the course', $seed['design'] === ( $o['items'][0]['course_id'] ?? 0 ), $o );
wp_eval( 'tutor_utils()->update_option( "monetize_by", "free" );' );

echo "Reviews\n";
$r = call( 'GET', '/courses/' . $seed['python'] . '/reviews', null, $token );
check( 'no reviews yet, can review', 200 === $r['status'] && 0 === $r['json']['total'] && true === $r['json']['can_review'] && null === $r['json']['mine'], $r['raw'] );
$r = call( 'PUT', '/courses/' . $seed['python'] . '/reviews/mine', array( 'rating' => 4, 'text' => "Clear lessons.\nGood pace." ), $token );
check( 'review saved', 200 === $r['status'] && 4 === ( $r['json']['rating'] ?? 0 ) && true === $r['json']['mine'] && "Clear lessons.\nGood pace." === $r['json']['text'], $r['raw'] );
$r = call( 'PUT', '/courses/' . $seed['python'] . '/reviews/mine', array( 'rating' => 5, 'text' => 'Even better.' ), $token );
check( 'review edited', 200 === $r['status'] && 5 === ( $r['json']['rating'] ?? 0 ), $r['raw'] );
$r = call( 'GET', '/courses/' . $seed['python'] . '/reviews' );
check( 'one review, summary counts it', 1 === $r['json']['total'] && 5.0 === (float) $r['json']['summary']['rating'] && 1 === $r['json']['summary']['counts']['5'] && 0 === $r['json']['summary']['counts']['4'], $r['raw'] );
check( 'signed out: no review form', false === $r['json']['can_review'] && null === $r['json']['mine'] && false === $r['json']['items'][0]['mine'], $r['json'] );
$r = call( 'GET', '/courses/' . $seed['python'] . '?platform=android' );
check( 'course rating updated', 5.0 === (float) ( $r['json']['rating'] ?? 0 ) && 1 === ( $r['json']['rating_count'] ?? 0 ), $r['json'] );
$r = call( 'PUT', '/courses/' . $seed['design'] . '/reviews/mine', array( 'rating' => 5 ), $token );
check( 'review needs enrollment', 403 === $r['status'] && 'not_enrolled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'PUT', '/courses/' . $seed['python'] . '/reviews/mine', array( 'rating' => 9 ), $token );
check( 'rating out of range 400', 400 === $r['status'], $r['raw'] );

echo "Questions\n";
$r = call( 'GET', '/courses/' . $seed['python'] . '/questions', null, $token );
check( 'q&a off for the course 403', 403 === $r['status'] && 'feature_disabled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
wp_eval( 'update_post_meta( ' . (int) $seed['python'] . ', "_tutor_enable_qa", "yes" );' );
$r = call( 'GET', '/courses/' . $seed['python'] . '?platform=android', null, $token );
check( 'course says q&a is on', true === ( $r['json']['qna'] ?? null ), $r['json'] );
$r = call( 'POST', '/courses/' . $seed['python'] . '/questions', array( 'text' => 'What does <b>range</b> return?' ), $token );
$question = $r['json']['id'] ?? 0;
check( 'question asked 201', 201 === $r['status'] && $question && 'What does range return?' === $r['json']['text'] && true === $r['json']['mine'] && 0 === $r['json']['answer_count'], $r['raw'] );
$r = call( 'GET', '/courses/' . $seed['python'] . '/questions', null, $token );
check( 'question listed', 200 === $r['status'] && 1 === $r['json']['total'] && $question === ( $r['json']['items'][0]['id'] ?? 0 ), $r['raw'] );
$r = call( 'POST', '/questions/' . $question . '/answers', array( 'text' => 'Also: is it a list?' ), $token );
check( 'reply 201', 201 === $r['status'] && true === ( $r['json']['mine'] ?? null ) && false === $r['json']['author']['instructor'], $r['raw'] );
wp_eval( 'wp_set_current_user( ' . (int) $seed['instructor'] . ' ); Yallapp\Plugin::instance()->lms()->answer( ' . (int) $question . ', ' . (int) $seed['instructor'] . ', "It returns a range object." );' );
$r = call( 'GET', '/questions/' . $question, null, $token );
check( 'thread with answers in order', 200 === $r['status'] && 2 === count( $r['json']['answers'] ?? array() ) && true === ( $r['json']['answers'][1]['author']['instructor'] ?? null ) && 2 === $r['json']['answer_count'], $r['raw'] );
$r = call( 'GET', '/me/notifications', null, $token );
check( 'instructor answer notifies the asker', 'qna_answer' === ( $r['json']['items'][0]['type'] ?? '' ) && $question === ( $r['json']['items'][0]['question_id'] ?? 0 ) && 1 === $r['json']['unread_count'], $r['raw'] );
$r = call( 'GET', '/courses/' . $seed['design'] . '/questions', null, $token );
check( 'questions need enrollment', in_array( $r['json']['code'] ?? '', array( 'not_enrolled', 'feature_disabled' ), true ) && 403 === $r['status'], $r['raw'] );
$r = call( 'POST', '/courses/' . $seed['python'] . '/questions', array( 'text' => '   ' ), $token );
check( 'empty question 400', 400 === $r['status'], $r['raw'] );
$r = call( 'GET', '/questions/999999', null, $token );
check( 'missing question 404', 404 === $r['status'], $r['raw'] );

echo "Settings\n";
function set_settings( array $values ) {
	wp_cli( 'eval ' . escapeshellarg( 'Yallapp\Plugin::instance()->settings()->update( json_decode( ' . var_export( json_encode( $values ), true ) . ', true ) );' ) );
}
set_settings( array( 'required_watch_percent' => 80 ) );
$r = call( 'POST', '/lessons/' . $seed['lesson_video'] . '/complete', array(), $token );
check( 'watch requirement enforced', 409 === $r['status'] && 'watch_requirement_not_met' === ( $r['json']['code'] ?? '' ), $r['raw'] );
call( 'PUT', '/lessons/' . $seed['lesson_video'] . '/progress', array( 'position_seconds' => 90, 'watched_percent' => 85 ), $token );
$r = call( 'POST', '/lessons/' . $seed['lesson_video'] . '/complete', array(), $token );
check( 'completes after watching enough', 200 === $r['status'], $r['raw'] );

set_settings( array( 'maintenance' => true, 'maintenance_message' => 'Back soon' ) );
$r = call( 'GET', '/courses' );
check( 'maintenance blocks API 503', 503 === $r['status'] && 'maintenance' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config still served in maintenance', 200 === $r['status'] && true === ( $r['json']['app']['maintenance'] ?? null ) && 'Back soon' === $r['json']['app']['maintenance_message'], $r['raw'] );
check( 'config says the app preview can sign in', true === ( $r['json']['auth']['preview_sign_in'] ?? null ), $r['json']['auth'] ?? null );
set_settings( array( 'maintenance' => false, 'required_watch_percent' => 0 ) );

$review = '5' . str_pad( (string) random_int( 0, 999999999 ), 9, '0', STR_PAD_LEFT );
set_settings( array( 'review_access_enabled' => true, 'review_phone' => '+90' . $review, 'review_code' => '424242' ) );
$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $review ) );
$v = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '424242', 'device' => device( 'review-1', 'ios' ) ) );
check( 'store review number accepts fixed code', 200 === $v['status'] && ( ! empty( $v['json']['signup_token'] ) || ! empty( $v['json']['access_token'] ) ), $v['raw'] );
// 38 Reviewers (and the owner's previews) sign in on new devices: the review account is never
// refused at the device limit, its oldest device is signed out instead.
set_settings( array( 'device_limit' => 2, 'device_limit_action' => 'block' ) );
if ( ! empty( $v['json']['signup_token'] ) ) {
	call( 'POST', '/auth/register', array( 'signup_token' => $v['json']['signup_token'], 'name' => 'App Review', 'device' => device( 'review-1', 'ios' ) ) );
}
foreach ( array( 'review-2', 'review-3' ) as $review_device ) {
	wp_cli( 'eval \'foreach ( array( "yallapp_cooldown_", "yallapp_rl_" ) as $p ) { global $wpdb; $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", "%" . $wpdb->esc_like( $p ) . "%" ) ); }\'' );
	$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $review ) );
	$v = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '424242', 'device' => device( $review_device ) ) );
}
check( 'store review number: a third device gets in', 200 === $v['status'] && ! empty( $v['json']['access_token'] ), $v['raw'] );
$r = call( 'GET', '/me/devices', null, $v['json']['access_token'] ?? '' );
check( 'store review number: its oldest device is signed out', 2 === count( $r['json']['items'] ?? array() ) && ! in_array( 'review-1', array_column( $r['json']['items'] ?? array(), 'id' ), true ), $r['raw'] );
// The app preview in the Yallapp dashboard never sends a code: only the store review number gets in.
$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => '5321234567', 'preview' => true ) );
check( 'preview: other numbers refused', 403 === $r['status'] && 'preview_review_number_only' === ( $r['json']['code'] ?? '' ), $r['raw'] );
wp_cli( 'eval \'global $wpdb; $wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE \"%yallapp_rl_%\"" );\'' );
$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $review, 'preview' => true ) );
check( 'preview: the store review number gets in', 200 === $r['status'] && ! empty( $r['json']['request_id'] ), $r['raw'] );
set_settings( array( 'review_access_enabled' => false ) );

echo "Sign-in codes sent by Yallapp\n";
// Inside the site, with the platform replaced by a pre_http_request filter (sign-in-codes-check.php).
$out    = (string) wp_cli( 'eval-file ' . escapeshellarg( __DIR__ . '/sign-in-codes-check.php' ) );
$result = json_decode( trim( $out ), true );
if ( ! is_array( $result ) || empty( $result['checks'] ) ) {
	check( 'sign-in code checks ran', false, $out );
} else {
	foreach ( $result['checks'] as $entry ) {
		check( $entry[0], $entry[1], $entry[2] );
	}
}
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'codes: the development code is back for the checks below', 200 === $r['status'], $r['raw'] );

echo "Settings reach the site at once (31)\n";
$r = call( 'POST', '/license/refresh', array( 'timestamp' => time(), 'signature' => str_repeat( 'a', 64 ) ) );
check( 'refresh: an unsigned nudge over HTTP 401', 401 === $r['status'] && 'invalid_signature' === ( $r['json']['code'] ?? '' ), $r['raw'] );
// Inside the site, with the platform replaced by a pre_http_request filter.
foreach ( array( 'license-refresh-check.php', 'settings-page-check.php' ) as $file ) {
	$out    = (string) wp_cli( 'eval-file ' . escapeshellarg( __DIR__ . '/' . $file ) );
	$result = json_decode( trim( $out ), true );
	if ( ! is_array( $result ) || empty( $result['checks'] ) ) {
		check( $file . ' ran', false, $out );
		continue;
	}
	foreach ( $result['checks'] as $entry ) {
		check( $entry[0], $entry[1], $entry[2] );
	}
}

echo "Sign-in by email and password\n";
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config: phone sign-in by default', array( 'phone' ) === ( $r['json']['auth']['methods'] ?? null ) && ! isset( $r['json']['auth']['email_sign_in'] ), $r['json']['auth'] ?? null );
$member = 'member' . random_int( 1000, 9999 ) . '@example.org';
wp_cli( 'user create ' . escapeshellarg( 'm' . md5( $member ) ) . ' ' . escapeshellarg( $member ) . ' --user_pass=' . escapeshellarg( 'Correct horse 7' ) . ' --role=subscriber' );
$r = call( 'POST', '/auth/password', array( 'email' => $member, 'password' => 'Correct horse 7', 'device' => device( 'pw-1' ) ) );
check( 'password: refused while the app signs in by phone', 403 === $r['status'] && 'method_not_allowed' === ( $r['json']['code'] ?? '' ), $r['raw'] );
set_settings( array( 'sign_in_methods' => 'both' ) );
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config: both methods, email with the password', array( 'phone', 'email' ) === ( $r['json']['auth']['methods'] ?? null ) && 'password' === ( $r['json']['auth']['email_sign_in'] ?? '' ) && false !== strpos( (string) ( $r['json']['auth']['password_reset_url'] ?? '' ), 'lostpassword' ), $r['json']['auth'] ?? null );
$wrong   = call( 'POST', '/auth/password', array( 'email' => $member, 'password' => 'wrong', 'device' => device( 'pw-1' ) ) );
$unknown = call( 'POST', '/auth/password', array( 'email' => 'nobody' . random_int( 1000, 9999 ) . '@example.org', 'password' => 'wrong', 'device' => device( 'pw-1' ) ) );
check( 'password: a wrong password and an unknown address get the same answer', 400 === $wrong['status'] && 400 === $unknown['status'] && 'invalid_credentials' === ( $wrong['json']['code'] ?? '' ) && $wrong['json'] === $unknown['json'], array( $wrong['raw'], $unknown['raw'] ) );
$r = call( 'POST', '/auth/password', array( 'email' => $member, 'password' => 'Correct horse 7', 'device' => device( 'pw-1' ) ) );
check( 'password: the WordPress account signs in', 200 === $r['status'] && ! empty( $r['json']['access_token'] ) && $member === ( $r['json']['user']['email'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/me', null, $r['json']['access_token'] ?? '' );
check( 'password: the session works', 200 === $r['status'] && $member === ( $r['json']['email'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/auth/password', array( 'email' => $member, 'password' => 'Correct horse 7', 'device' => device( 'pw-2' ), 'preview' => true ) );
check( 'password: not in the app preview', 403 === $r['status'] && 'preview_review_number_only' === ( $r['json']['code'] ?? '' ), $r['raw'] );
for ( $i = 0; $i < 6; $i++ ) {
	$r = call( 'POST', '/auth/password', array( 'email' => $member, 'password' => 'wrong ' . $i, 'device' => device( 'pw-1' ) ) );
}
check( 'password: limited per address', 429 === $r['status'] && 'rate_limited' === ( $r['json']['code'] ?? '' ), $r['raw'] );
set_settings( array( 'sign_in_methods' => 'email' ) );
$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT ) ) );
check( 'email only: phone codes refused', 403 === $r['status'] && 'method_not_allowed' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$newcomer = 'newcomer' . random_int( 1000, 9999 ) . '@example.org';
$r        = call( 'POST', '/auth/email/request', array( 'email' => $newcomer ) );
check( 'email codes: refused while email signs in with the password', 403 === $r['status'] && 'method_not_allowed' === ( $r['json']['code'] ?? '' ), $r['raw'] );
set_settings( array( 'email_sign_in' => 'code' ) );
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config: email with a code, no password page', array( 'email' ) === ( $r['json']['auth']['methods'] ?? null ) && 'code' === ( $r['json']['auth']['email_sign_in'] ?? '' ) && ! isset( $r['json']['auth']['password_reset_url'] ), $r['json']['auth'] ?? null );
$r = call( 'POST', '/auth/email/request', array( 'email' => $newcomer ) );
check( 'email codes: a code is sent', 200 === $r['status'] && ! empty( $r['json']['request_id'] ) && 6 === ( $r['json']['code_length'] ?? 0 ), $r['raw'] );
$r = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '123456', 'device' => device( 'mail-1' ) ) );
check( 'email codes: a new address signs up', 200 === $r['status'] && ! empty( $r['json']['signup_token'] ), $r['raw'] );
$r = call( 'POST', '/auth/register', array( 'signup_token' => $r['json']['signup_token'] ?? '', 'name' => 'New Comer', 'device' => device( 'mail-1' ) ) );
check( 'email codes: the WordPress account is made with that address', 201 === $r['status'] && $newcomer === ( $r['json']['user']['email'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/auth/email/request', array( 'email' => 'not-an-address' ) );
check( 'email codes: an invalid address', 400 === $r['status'] && 'invalid_email' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/auth/email/request', array( 'email' => $member, 'preview' => true ) );
check( 'email codes: not in the app preview', 403 === $r['status'] && 'preview_review_number_only' === ( $r['json']['code'] ?? '' ), $r['raw'] );
set_settings( array( 'sign_in_methods' => 'phone', 'email_sign_in' => 'password' ) );
wp_cli( 'eval \'global $wpdb; $wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE \"%yallapp_rl_%\"" );\'' );

set_settings( array( 'device_limit_action' => 'replace_oldest' ) );
wp_cli( 'eval \'global $wpdb; $wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE \"%yallapp_rl_%\"" );\'' );
$d = sign_in( $phone, device( 'dev-d' ) );
check( 'replace oldest lets a new device in', 200 === $d['status'], $d['raw'] );
$r = call( 'GET', '/me/devices', null, $d['json']['access_token'] ?? '' );
$ids = array_map( function ( $x ) { return $x['id']; }, $r['json']['items'] ?? array() );
check( 'still two devices, newest kept', 2 === count( $ids ) && in_array( 'dev-d', $ids, true ), $ids );
set_settings( array( 'device_limit_action' => 'block' ) );
$token = in_array( 'dev-a', $ids, true ) ? $token : ( $d['json']['access_token'] ?? $token );
$rotated = in_array( 'dev-a', $ids, true ) ? $rotated : $d['json'];

echo "Links that open the app (46)\n";
// What the platform's license status would send; restored at the end.
$saved_license = wp_eval( 'echo wp_json_encode( get_option( "yallapp_license", null ) );' );
$play          = '14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5';
$root          = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' );
$r             = call( 'GET', $root . '/.well-known/assetlinks.json' );
check( 'links: no file before the platform sends the app\'s fingerprints', 404 === $r['status'], $r['status'] );
wp_eval( 'update_option( "yallapp_license", array_merge( (array) get_option( "yallapp_license", array() ), array( "app_links" => array( "android" => array( "package_name" => "com.ada.academy", "sha256_cert_fingerprints" => array( "' . $play . '" ) ), "ios" => array( "app_ids" => array( "A1B2C3D4E5.com.ada.academy" ) ) ), "review_prompt" => false ) ), false );' );
$r = call( 'GET', $root . '/.well-known/assetlinks.json' );
check(
	'links: assetlinks.json at the root, as JSON, with the package and fingerprint',
	200 === $r['status'] && false !== strpos( $r['headers'], 'content-type: application/json' ) && 'com.ada.academy' === ( $r['json'][0]['target']['package_name'] ?? '' ) && array( $play ) === ( $r['json'][0]['target']['sha256_cert_fingerprints'] ?? null ) && array( 'delegate_permission/common.handle_all_urls' ) === ( $r['json'][0]['relation'] ?? null ),
	$r['headers'] . $r['raw']
);
$r = call( 'GET', $root . '/.well-known/apple-app-site-association' );
check(
	'links: apple-app-site-association without an extension, as JSON, for /a/* only',
	200 === $r['status'] && false !== strpos( $r['headers'], 'content-type: application/json' ) && array( 'A1B2C3D4E5.com.ada.academy' ) === ( $r['json']['applinks']['details'][0]['appIDs'] ?? null ) && array( array( '/' => '/a/*' ) ) === ( $r['json']['applinks']['details'][0]['components'] ?? null ),
	$r['raw']
);
$course_url = wp_eval( 'echo get_permalink( ' . (int) $seed['python'] . ' );' );
$r          = call( 'GET', $root . '/a/course/' . (int) $seed['python'] );
check( 'links: a course link without the app goes to the course\'s own page', 302 === $r['status'] && false !== strpos( $r['headers'], 'location: ' . strtolower( $course_url ) ), $r['headers'] );
$draft = (int) wp_eval( 'echo wp_insert_post( array( "post_type" => "post", "post_status" => "draft", "post_title" => "Not yet" ) );' );
foreach ( array( '/a/course/999999', '/a/article/' . $draft, '/a/page/home' ) as $path ) {
	$r = call( 'GET', $root . $path );
	check( 'links: ' . $path . ' goes to the home page (nothing public there)', 302 === $r['status'] && preg_match( '#location: ' . preg_quote( strtolower( $root ), '#' ) . '/?\r?\n#', $r['headers'] ), $r['headers'] );
}
$r = call( 'GET', $root . '/a/lesson/1' );
check( 'links: other paths under /a/ are left to WordPress', 302 !== $r['status'], $r['status'] );
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'links: config shares <site>/a and carries the owner\'s switches', $root . '/a' === ( $r['json']['links']['share_base_url'] ?? '' ) && false === ( $r['json']['app']['review_prompt'] ?? null ) && true === ( $r['json']['app']['crash_reports'] ?? null ), $r['json']['app'] ?? $r['raw'] );
wp_eval( 'wp_delete_post( ' . $draft . ', true );' );
wp_eval( '$v = json_decode( ' . var_export( $saved_license, true ) . ', true ); if ( null === $v ) { delete_option( "yallapp_license" ); } else { update_option( "yallapp_license", $v, false ); }' );
$r = call( 'GET', $root . '/.well-known/assetlinks.json' );
check( 'links: back to no file', 404 === $r['status'], $r['status'] );

echo "Sign-out\n";
$r = call( 'POST', '/auth/logout', array(), $token );
check( 'logout 204', 204 === $r['status'], $r['raw'] );
$r = call( 'POST', '/auth/refresh', array( 'refresh_token' => $rotated['refresh_token'] ) );
check( 'refresh after logout 401', 401 === $r['status'], $r['raw'] );

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
