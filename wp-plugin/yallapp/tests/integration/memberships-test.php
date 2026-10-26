<?php
/**
 * 90.3 Paid Memberships Pro on a Tutor LMS site: a course that needs a membership can't be
 * joined in the app without one, opens in one tap with one, closes when it ends, and the
 * student's memberships show in the app.
 *
 * Runs against the Tutor LMS dev site with Paid Memberships Pro (setup.sh with
 * MEMBERSHIPS=1): the free Python course requires the "Gold" level.
 *
 * Usage: WP_CLI='wp --path=<site>' SEED_IDS='{...}' php memberships-test.php http://127.0.0.1:8089
 *
 * @package Yallapp
 */

// phpcs:disable -- Standalone CLI test script, not loaded by WordPress.

$site  = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' );
$base  = $site . '/wp-json/yallapp/v1';
$seed  = json_decode( (string) getenv( 'SEED_IDS' ), true );
$fails = 0;
$count = 0;
if ( ! is_array( $seed ) || empty( $seed['gold'] ) ) {
	fwrite( STDERR, "Set SEED_IDS to the yallapp_seed_ids option of a site built with MEMBERSHIPS=1.\n" );
	exit( 2 );
}

function call( $method, $path, $body = null, $token = null ) {
	global $base;
	$ch = curl_init( $base . $path );
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
			CURLOPT_TIMEOUT        => 60,
		)
	);
	$raw    = (string) curl_exec( $ch );
	$status = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
	curl_close( $ch );
	return array(
		'status' => $status,
		'raw'    => $raw,
		'json'   => json_decode( $raw, true ),
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

function sign_up( $name ) {
	$device = array(
		'id'          => 'members-' . $name,
		'platform'    => 'android',
		'name'        => 'Phone',
		'app_version' => '1.0.0',
	);
	$phone  = '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT );
	$r      = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
	$r      = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '123456', 'device' => $device ) );
	$r      = call( 'POST', '/auth/register', array( 'signup_token' => $r['json']['signup_token'] ?? '', 'name' => $name, 'device' => $device ) );
	return $r['json'] ?? array();
}

function wp_eval( $php ) {
	return trim( (string) shell_exec( getenv( 'WP_CLI' ) . ' eval ' . escapeshellarg( $php ) . ' 2>/dev/null' ) );
}

$python = (int) $seed['python'];
$lesson = (int) $seed['lesson_html'];
$gold   = (int) $seed['gold'];

echo "Config\n";
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'memberships are on', true === ( $r['json']['features']['memberships'] ?? null ), $r['raw'] );

echo "A course that needs Gold, without it\n";
$a  = sign_up( 'Ayla' );
$at = $a['access_token'] ?? '';
check( 'signed up', '' !== $at, $a );
$r = call( 'GET', '/courses/' . $python . '?platform=android', null, $at );
check( 'the plans are named', array( 'has_access' => false, 'plans' => array( 'Gold' ) ) === ( $r['json']['membership'] ?? null ), $r['json']['membership'] ?? $r['raw'] );
check( 'nothing to press', 'none' === ( $r['json']['purchase']['action'] ?? '' ), $r['json']['purchase'] ?? $r['raw'] );
$r = call( 'POST', '/courses/' . $python . '/enroll', array(), $at );
check( 'joining is refused', 403 === $r['status'] && 'membership_required' === ( $r['json']['code'] ?? '' ), $r['raw'] );
check( 'the refusal names the plan', false !== strpos( (string) ( $r['json']['message'] ?? '' ), 'Gold' ), $r['raw'] );
$r = call( 'GET', '/courses/' . (int) $seed['english'] . '?platform=android', null, $at );
check( 'a course without a membership is as before', array_key_exists( 'membership', (array) $r['json'] ) && null === $r['json']['membership'] && 'enroll_free' === ( $r['json']['purchase']['action'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/me/subscriptions', null, $at );
check( 'no memberships yet', 200 === $r['status'] && array() === ( $r['json']['items'] ?? null ), $r['raw'] );
check( 'subscriptions need sign-in', 401 === call( 'GET', '/me/subscriptions' )['status'] );

echo "With Gold\n";
$user = (int) ( $a['user']['id'] ?? 0 );
wp_eval( 'pmpro_changeMembershipLevel( ' . $gold . ', ' . $user . ' );' );
$r = call( 'GET', '/courses/' . $python . '?platform=ios', null, $at );
check( 'the student has the plan', true === ( $r['json']['membership']['has_access'] ?? null ), $r['raw'] );
check( 'one tap joins it, iOS too', 'enroll_free' === ( $r['json']['purchase']['action'] ?? '' ), $r['json']['purchase'] ?? $r['raw'] );
$r = call( 'POST', '/courses/' . $python . '/enroll', array(), $at );
check( 'joined', in_array( $r['status'], array( 200, 201 ), true ) && $python === (int) ( $r['json']['course_id'] ?? 0 ), $r['raw'] );
$r = call( 'GET', '/lessons/' . $lesson, null, $at );
check( 'its lessons open', 200 === $r['status'], $r['raw'] );
$r     = call( 'GET', '/me/subscriptions', null, $at );
$items = (array) ( $r['json']['items'] ?? array() );
check( 'Gold is listed', 1 === count( $items ) && 'pmpro-' . $gold === ( $items[0]['id'] ?? '' ) && 'paid_memberships_pro' === ( $items[0]['source'] ?? '' ) && 'Gold' === ( $items[0]['name'] ?? '' ) && 'active' === ( $items[0]['status'] ?? '' ), $r['raw'] );
check( 'with when it started, and no end', is_string( $items[0]['started_at'] ?? null ) && array_key_exists( 'ends_at', (array) ( $items[0] ?? array() ) ) && null === $items[0]['ends_at'], $items[0] ?? null );

echo "Gold ends\n";
wp_eval( 'pmpro_changeMembershipLevel( 0, ' . $user . ' );' );
$r = call( 'GET', '/lessons/' . $lesson, null, $at );
check( 'the lessons close', 403 === $r['status'] && 'membership_required' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/me/subscriptions', null, $at );
check( 'nothing listed', array() === ( $r['json']['items'] ?? null ), $r['raw'] );

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
