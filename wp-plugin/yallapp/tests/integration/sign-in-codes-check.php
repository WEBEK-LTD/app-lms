<?php
/**
 * Checks of "Sent by Yallapp" sign-in codes inside the dev site, with the platform replaced by a
 * pre_http_request filter: the provider choice and its fallbacks, the request to
 * POST /sign-in-codes/send, codes kept only as a hash, verification (wrong, right, expired, too
 * many attempts), Digits accounts signing in with the same number, and platform errors.
 * Leaves the site as it found it: no license, so the HTTP checks keep the development code.
 *
 * Usage: wp eval-file tests/integration/sign-in-codes-check.php
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\Auth\Rate_Limiter;
use Yallapp\Crypto;
use Yallapp\Otp\Email_Codes;
use Yallapp\Otp\Methods;
use Yallapp\Otp\Phone;
use Yallapp\Otp\Sign_In;
use Yallapp\Otp\Yallapp_Adapter;
use Yallapp\Plugin;

$checks   = array();
$requests = array();
$reply    = null;

$check = static function ( $name, $ok, $detail = '' ) use ( &$checks ) {
	$checks[] = array( $name, (bool) $ok, is_string( $detail ) ? $detail : wp_json_encode( $detail ) );
};
$respond = static function ( $code, $body = '' ) {
	return array(
		'headers'  => array(),
		'body'     => is_array( $body ) ? wp_json_encode( $body ) : $body,
		'response' => array(
			'code'    => $code,
			'message' => '',
		),
		'cookies'  => array(),
		'filename' => null,
	);
};
// The fake platform: records each sign-in code request and answers with $reply (204 by default).
add_filter(
	'pre_http_request',
	static function ( $pre, $request, $url ) use ( &$requests, &$reply, $respond ) {
		if ( false === strpos( $url, '/sign-in-codes/send' ) ) {
			return $pre;
		}
		$requests[] = array(
			'url'    => $url,
			'method' => $request['method'],
			'body'   => json_decode( (string) $request['body'], true ),
		);
		return null !== $reply ? $reply : $respond( 204 );
	},
	10,
	3
);

$plugin   = Plugin::instance();
$settings = $plugin->settings();
$license  = $plugin->license();
$activate = static function () use ( $settings ) {
	$settings->update( array( 'license_key' => 'YALL-TEST-0000-0002' ) );
	update_option( 'yallapp_license', array( 'status' => 'active', 'plan' => 'starter', 'features' => array(), 'contacted_at' => time() ), false );
};
$forget   = static function () use ( $settings ) {
	$settings->update( array( 'license_key' => '', 'otp_provider' => 'yallapp' ) );
	delete_option( 'yallapp_license' );
};
$phone_no = static function () {
	return '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT );
};
$clear    = static function ( Phone $phone ) {
	Rate_Limiter::clear( 'resend|' . $phone->e164() );
	Rate_Limiter::clear( 'phone|' . $phone->e164() );
	Rate_Limiter::clear( 'ip|' . Rate_Limiter::client_ip() );
};
$last_code = static function () use ( &$requests ) {
	$last = end( $requests );
	return $last ? (string) ( $last['body']['code'] ?? '' ) : '';
};
$device = array(
	'id'          => 'codes-' . wp_rand(),
	'platform'    => 'android',
	'name'        => 'Codes check',
	'app_version' => '1.0.0',
);

// The provider choice.
$forget();
$check( 'codes: Yallapp is the default choice', 'yallapp' === $settings->get( 'otp_provider' ) );
$choice = $plugin->otp_choice();
$check( 'codes: without a license, development codes stand in', 'dev' === $choice['id'] && $choice['fallback'] && 'yallapp' === $choice['saved'], $choice );
$activate();
$choice = $plugin->otp_choice();
$check( 'codes: with an active license, Yallapp sends them', 'yallapp' === $choice['id'] && ! $choice['fallback'], $choice );
$settings->update( array( 'otp_provider' => 'digits' ) );
$choice = $plugin->otp_choice();
$check( 'codes: Digits without its REST API falls back to Yallapp', 'yallapp' === $choice['id'] && $choice['fallback'] && 'digits' === $choice['saved'], $choice );
$settings->update( array( 'otp_provider' => 'yallapp' ) );

$sign_in = new Sign_In( $settings, new Yallapp_Adapter( $license ), $plugin->devices(), $plugin->tokens() );

// A new number: the code goes to the platform, then signs up.
$number = $phone_no();
$phone  = Phone::parse( '+90', $number );
$clear( $phone );
$sent = $sign_in->request( '+90', '0' . $number );
$last = end( $requests );
$code = $last_code();
$check( 'codes: request answers like Digits', is_array( $sent ) && ! empty( $sent['request_id'] ) && 6 === $sent['code_length'] && 300 === $sent['expires_in_seconds'], $sent );
$check(
	'codes: platform gets POST /sign-in-codes/send with SiteInfo, number and code',
	$last && '/api/v1/sign-in-codes/send' === substr( $last['url'], -26 ) && 'POST' === $last['method']
		&& 'YALL-TEST-0000-0002' === ( $last['body']['license_key'] ?? '' ) && ! empty( $last['body']['site_url'] ) && YALLAPP_VERSION === ( $last['body']['plugin_version'] ?? '' )
		&& $phone->e164() === ( $last['body']['phone'] ?? '' ) && 1 === preg_match( '/^\d{6}$/', $code ) && '' !== (string) ( $last['body']['app_name'] ?? '' ),
	$last
);
global $wpdb;
$stored = array();
foreach ( $wpdb->get_results( "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE '%yallapp_code_%'", ARRAY_A ) as $row ) {
	if ( 0 === strpos( $row['option_name'], '_transient_yallapp_code_' ) ) {
		$stored[ $row['option_name'] ] = maybe_unserialize( $row['option_value'] );
	}
}
$record = reset( $stored );
$check(
	'codes: kept on the site only as a hash',
	1 === count( $stored ) && false === strpos( (string) key( $stored ), $number ) && is_array( $record )
		&& ! in_array( $code, $record, true ) && 64 === strlen( (string) ( $record['hash'] ?? '' ) ),
	$stored
);
$wrong = $sign_in->verify( $sent['request_id'], '000000' === $code ? '111111' : '000000', $device );
$check( 'codes: a wrong code is refused', is_wp_error( $wrong ) && 'invalid_code' === $wrong->get_error_code(), $wrong );
$right = $sign_in->verify( $sent['request_id'], $code, $device );
$check( 'codes: the right code signs up a new number', is_array( $right ) && ! empty( $right['signup_token'] ), $right );

// A code works once.
$clear( $phone );
$again = $sign_in->request( '+90', $number );
$code  = $last_code();
$right = $sign_in->verify( $again['request_id'], $code, $device );
$reuse = ( new Yallapp_Adapter( $license ) )->verify( $phone, $code, true );
$check( 'codes: a used code no longer works', is_array( $right ) && is_wp_error( $reuse ) && 'code_expired' === $reuse->get_error_code(), $reuse );

// An account made with Digits signs in with the same number.
$digits_no = $phone_no();
$digits_ph = Phone::parse( '+90', $digits_no );
$user_id   = wp_insert_user(
	array(
		'user_login' => 'digits' . $digits_no,
		'user_pass'  => wp_generate_password(),
		'role'       => 'subscriber',
	)
);
update_user_meta( $user_id, 'digits_phone', $digits_ph->e164() );
update_user_meta( $user_id, 'digt_countrycode', '+90' );
update_user_meta( $user_id, 'digits_phone_no', $digits_no );
$clear( $digits_ph );
$sent    = $sign_in->request( '+90', $digits_no );
$session = $sign_in->verify( $sent['request_id'], $last_code(), $device );
$check( 'codes: a Digits account signs in with its number', is_array( $session ) && $user_id === ( $session['user']['id'] ?? 0 ) && $digits_ph->e164() === ( $session['user']['phone'] ?? '' ), $session );
$plugin->devices()->remove( $user_id, (int) ( $plugin->devices()->for_user( $user_id )[0]->id ?? 0 ) );
wp_delete_user( $user_id );

// Expired codes and too many attempts.
$adapter = new Yallapp_Adapter( $license );
$clear( $phone );
$adapter->send( $phone, false );
$key    = 'yallapp_code_' . substr( hash( 'sha256', $phone->e164() ), 0, 40 );
$record = get_transient( $key );
$record['expires_at'] = time() - 1;
set_transient( $key, $record, 60 );
$late = $adapter->verify( $phone, $last_code(), false );
$check( 'codes: an expired code is refused', is_wp_error( $late ) && 'code_expired' === $late->get_error_code(), $late );
$adapter->send( $phone, false );
$code = $last_code();
for ( $i = 0; $i < 5; $i++ ) {
	$tries = $adapter->verify( $phone, '000000' === $code ? '111111' : '000000', false );
}
$after = $adapter->verify( $phone, $code, false );
$check( 'codes: five wrong codes end the code', is_wp_error( $tries ) && false !== strpos( $tries->get_error_message(), 'Too many' ) && is_wp_error( $after ), array( $tries, $after ) );

// Platform errors.
$reply  = $respond( 429, array( 'code' => 'rate_limited', 'message' => 'Too many sign-in codes.', 'retry_after_seconds' => 42 ) );
$result = $adapter->send( $phone, false );
$check( 'codes: platform 429 asks the app to wait', is_wp_error( $result ) && 'rate_limited' === $result->get_error_code() && 429 === $result->get_error_data()['status'] && 42 === $result->get_error_data()['retry_after_seconds'], $result );
$reply  = $respond( 403, array( 'code' => 'license_inactive', 'message' => 'This license has ended, so Yallapp can\'t send sign-in codes for it.' ) );
$result = $adapter->send( $phone, false );
$error  = Yallapp_Adapter::last_error();
$check( 'codes: platform 403 is a provider error, explained on the settings page', is_wp_error( $result ) && 'provider_error' === $result->get_error_code() && 502 === $result->get_error_data()['status'] && $error && false !== strpos( $error['message'], 'has ended' ), array( $result, $error ) );
$reply  = new WP_Error( 'http_request_failed', 'timeout' );
$result = $adapter->send( $phone, false );
$check( 'codes: an unreachable platform is a provider error', is_wp_error( $result ) && 'provider_error' === $result->get_error_code(), $result );
$none = $adapter->verify( $phone, '123456', false );
$check( 'codes: a failed send keeps no code', is_wp_error( $none ) && 'code_expired' === $none->get_error_code(), $none );
$reply = null;

// Email sign-in with a code: Yallapp emails the code, a new address signs up, staff never sign in by code.
$activate();
$settings->update( array( 'sign_in_methods' => 'email', 'email_sign_in' => 'code', 'signup_allowed' => true ) );
$by_mail   = new Sign_In( $settings, new Yallapp_Adapter( $license ), $plugin->devices(), $plugin->tokens(), $license, new Email_Codes( $license ) );
$clear_box = static function ( $email ) {
	$bucket = substr( Crypto::hash( Email_Codes::subject( $email ) ), 0, 40 );
	Rate_Limiter::clear( 'resend|' . $bucket );
	Rate_Limiter::clear( 'email|' . $bucket );
	Rate_Limiter::clear( 'ip|' . Rate_Limiter::client_ip() );
};
$check( 'email codes: the owner\'s choice is code', Methods::CODE === $by_mail->email_way() );
$address = 'codes-' . wp_rand( 100000, 999999 ) . '@example.com';
$clear_box( $address );
$count = count( $requests );
$sent  = $by_mail->request_email( strtoupper( $address ) );
$last  = end( $requests );
$code  = $last_code();
$check(
	'email codes: the platform gets channel email, the address and the code',
	is_array( $sent ) && ! empty( $sent['request_id'] ) && count( $requests ) === $count + 1 && 'email' === ( $last['body']['channel'] ?? '' )
		&& $address === ( $last['body']['email'] ?? '' ) && ! isset( $last['body']['phone'] ) && 1 === preg_match( '/^\d{6}$/', $code ),
	$last
);
$stored = $wpdb->get_col( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '_transient_yallapp_email_code_%'" );
$check( 'email codes: kept only as a hash, under no address', count( $stored ) >= 1 && false === strpos( implode( ' ', $stored ), 'example.com' ), $stored );
$wrong = $by_mail->verify( $sent['request_id'], '000000' === $code ? '111111' : '000000', $device );
$check( 'email codes: a wrong code is refused', is_wp_error( $wrong ) && 'invalid_code' === $wrong->get_error_code(), $wrong );
$signup = $by_mail->verify( $sent['request_id'], $code, $device );
$check( 'email codes: a new address is asked to sign up, without asking its email again', is_array( $signup ) && ! empty( $signup['signup_token'] ) && ! in_array( 'email', $signup['fields'], true ), $signup );
$made = $by_mail->register( $signup['signup_token'], array( 'name' => 'Sara Code' ), $device );
$check( 'email codes: sign-up makes a WordPress account with that address', is_array( $made ) && $address === ( $made['user']['email'] ?? '' ) && 'Sara Code' === ( $made['user']['name'] ?? '' ), $made );
$new_id = (int) ( $made['user']['id'] ?? 0 );
$clear_box( $address );
$again   = $by_mail->request_email( $address );
$session = $by_mail->verify( $again['request_id'], $last_code(), $device );
$check( 'email codes: the account signs in again by code', is_array( $session ) && $new_id === ( $session['user']['id'] ?? 0 ), $session );

$staff_mail = 'editor-' . wp_rand( 100000, 999999 ) . '@example.com';
$staff_id   = wp_insert_user(
	array(
		'user_login' => 'editor' . wp_rand( 100000, 999999 ),
		'user_pass'  => wp_generate_password(),
		'user_email' => $staff_mail,
		'role'       => 'editor',
	)
);
$clear_box( $staff_mail );
$count = count( $requests );
$staff = $by_mail->request_email( $staff_mail );
$check( 'email codes: a staff account gets the same answer but no email', is_array( $staff ) && ! empty( $staff['request_id'] ) && count( $requests ) === $count, $staff );
$denied = $by_mail->verify( $staff['request_id'], $code, $device );
$check( 'email codes: no code signs in a staff account', is_wp_error( $denied ) && 'invalid_code' === $denied->get_error_code(), $denied );

$settings->update( array( 'signup_allowed' => false ) );
$closed = 'closed-' . wp_rand( 100000, 999999 ) . '@example.com';
$clear_box( $closed );
$asked  = $by_mail->request_email( $closed );
$closed_result = $by_mail->verify( $asked['request_id'], $last_code(), $device );
$check( 'email codes: with sign-up off, a new address gets no account', is_wp_error( $closed_result ) && 'signup_disabled' === $closed_result->get_error_code(), $closed_result );

$settings->update( array( 'signup_allowed' => true, 'email_sign_in' => 'password' ) );
$refused = $by_mail->request_email( $address );
$check( 'email codes: refused when email signs in with the password', is_wp_error( $refused ) && 'method_not_allowed' === $refused->get_error_code(), $refused );
update_option( 'yallapp_license', array( 'status' => 'active', 'plan' => 'starter', 'features' => array(), 'email_sign_in' => 'code', 'contacted_at' => time() ), false );
$check( 'email codes: the dashboard\'s choice replaces the setting', Methods::CODE === $by_mail->email_way() );
$settings->update( array( 'sign_in_methods' => 'phone', 'email_sign_in' => 'password' ) );
foreach ( array( $new_id, $staff_id ) as $id ) {
	foreach ( $plugin->devices()->for_user( $id ) as $row ) {
		$plugin->devices()->remove( $id, (int) $row->id );
	}
	wp_delete_user( $id );
}

// Without an active license, nothing is asked.
$forget();
$count  = count( $requests );
$result = ( new Yallapp_Adapter( $license ) )->send( $phone, false );
$check( 'codes: no license, no request', is_wp_error( $result ) && count( $requests ) === $count, $result );

delete_transient( Yallapp_Adapter::LAST_ERROR );
$clear( $phone );
echo wp_json_encode( array( 'checks' => $checks ) );
