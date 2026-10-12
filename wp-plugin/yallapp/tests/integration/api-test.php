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
set_settings( array( 'maintenance' => false, 'required_watch_percent' => 0 ) );

$review = '5' . str_pad( (string) random_int( 0, 999999999 ), 9, '0', STR_PAD_LEFT );
set_settings( array( 'review_access_enabled' => true, 'review_phone' => '+90' . $review, 'review_code' => '424242' ) );
$r = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $review ) );
$v = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '424242', 'device' => device( 'review-1', 'ios' ) ) );
check( 'store review number accepts fixed code', 200 === $v['status'] && ( ! empty( $v['json']['signup_token'] ) || ! empty( $v['json']['access_token'] ) ), $v['raw'] );
set_settings( array( 'review_access_enabled' => false ) );

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

echo "Sign-out\n";
$r = call( 'POST', '/auth/logout', array(), $token );
check( 'logout 204', 204 === $r['status'], $r['raw'] );
$r = call( 'POST', '/auth/refresh', array( 'refresh_token' => $rotated['refresh_token'] ) );
check( 'refresh after logout 401', 401 === $r['status'], $r['raw'] );

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
