<?php
/**
 * 68 An ended plan pauses the app, checked inside the dev site with the license enforced (the
 * `yallapp_enforce_license` filter; the dev site turns it off in wp-config.php): a status the
 * platform last said was active whose `expires_at` has passed pauses every route with
 * `license_inactive` and the owner's contact, `/config` included; a suspended account answers
 * `account_suspended`; a signed-in student still deletes their account; `/license/refresh`
 * still answers; push and offline mode are off; the settings page says the plan ended. Then an
 * active plan answers again. The platform is never called (pre_http_request).
 * Leaves the site as it found it: no license, enforcement off.
 *
 * Usage: wp eval-file tests/integration/license-paused-check.php
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\License\License_Client;
use Yallapp\Plugin;

$checks = array();
$check  = static function ( $name, $ok, $detail = '' ) use ( &$checks ) {
	$checks[] = array( $name, (bool) $ok, is_string( $detail ) ? $detail : wp_json_encode( $detail ) );
};

$calls = 0;
add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) use ( &$calls ) {
		if ( 0 === strpos( $url, License_Client::base_url() ) ) {
			++$calls;
			return new WP_Error( 'http_request_failed', 'The platform is unreachable in this check.' );
		}
		return $pre;
	},
	10,
	3
);

$plugin   = Plugin::instance();
$settings = $plugin->settings();
$saved    = array(
	'license_key'      => (string) $settings->get( 'license_key' ),
	'app_name'         => (string) $settings->get( 'app_name' ),
	'support_whatsapp' => (string) $settings->get( 'support_whatsapp' ),
	'support_email'    => (string) $settings->get( 'support_email' ),
);
$check( 'paused: the dev site starts with the license checks off', ! License_Client::enforced(), License_Client::enforced() );
$enforce = static function () {
	return true;
};
add_filter( 'yallapp_enforce_license', $enforce );
$check( 'paused: the filter turns them on', License_Client::enforced() );

$settings->update(
	array(
		'license_key'      => 'YALL-TEST-0000-0068',
		'app_name'         => 'Ada Academy',
		'support_whatsapp' => '+905321112233',
		'support_email'    => 'help@ada.test',
	)
);
$status = static function ( $state, $expires_at ) {
	update_option(
		License_Client::STATUS_OPTION,
		array(
			'status'       => $state,
			'plan'         => 'growth',
			'features'     => array( 'push', 'offline_downloads' ),
			'expires_at'   => $expires_at,
			'checked_at'   => gmdate( 'c' ),
			'contacted_at' => time(),
		),
		false
	);
};
$request = static function ( $method, $route, $query = array() ) {
	$r = new WP_REST_Request( $method, '/yallapp/v1' . $route );
	foreach ( $query as $k => $v ) {
		$r->set_param( $k, $v );
	}
	$response = rest_do_request( $r );
	return array( $response->get_status(), $response->get_data() );
};
$config = array(
	'platform'    => 'android',
	'app_version' => '1.0.0',
);

// A plan the platform said was active a minute ago, which ended an hour ago.
$status( 'active', gmdate( 'c', time() - HOUR_IN_SECONDS ) );
$check( 'paused: an active status whose end passed is expired, offline', 'expired' === $plugin->license()->state() && ! $plugin->license()->is_active(), $plugin->license()->state() );
list( $code, $data ) = $request( 'GET', '/config', $config );
$check( 'paused: /config 503 license_inactive with the contact', 503 === $code && 'license_inactive' === ( $data['code'] ?? '' ) && 'Ada Academy' === ( $data['contact']['name'] ?? '' ) && '+905321112233' === ( $data['contact']['whatsapp'] ?? '' ) && 'help@ada.test' === ( $data['contact']['email'] ?? '' ), array( $code, $data ) );
$check( 'paused: the message names the app', 'Ada Academy is paused right now. Please contact Ada Academy to bring it back.' === ( $data['message'] ?? '' ), $data );
list( $code, $data ) = $request( 'GET', '/courses' );
$check( 'paused: content routes 503 license_inactive', 503 === $code && 'license_inactive' === ( $data['code'] ?? '' ), array( $code, $data ) );
list( $code, $data ) = $request( 'GET', '/me' );
$check( 'paused: GET /me 503', 503 === $code, array( $code, $data ) );
$r = new WP_REST_Request( 'POST', '/yallapp/v1/auth/otp/request' );
$r->set_header( 'Content-Type', 'application/json' );
$r->set_body( wp_json_encode( array( 'country_code' => '+90', 'phone' => '5321234567' ) ) );
$response = rest_do_request( $r );
$check( 'paused: signing in 503', 503 === $response->get_status(), $response->get_data() );
$r = new WP_REST_Request( 'POST', '/yallapp/v1/auth/refresh' );
$r->set_header( 'Content-Type', 'application/json' );
$r->set_body( wp_json_encode( array( 'refresh_token' => 'not-a-token' ) ) );
$response = rest_do_request( $r );
$check( 'paused: /auth/refresh still answers (401 for a wrong token, not 503)', 503 !== $response->get_status() && 'license_inactive' !== ( $response->get_data()['code'] ?? '' ), array( $response->get_status(), $response->get_data() ) );
$r = new WP_REST_Request( 'POST', '/yallapp/v1/license/refresh' );
$r->set_header( 'Content-Type', 'application/json' );
$r->set_body( wp_json_encode( array( 'timestamp' => time(), 'signature' => str_repeat( 'a', 64 ) ) ) );
$response = rest_do_request( $r );
$check( 'paused: /license/refresh still answers (401 unsigned)', 401 === $response->get_status(), array( $response->get_status(), $response->get_data() ) );
$check( 'paused: push and offline mode are off', ! $plugin->license()->has_feature( 'push' ) && ! $plugin->license()->has_feature( 'offline_downloads' ) );

// A signed-in student deletes their account while the app is paused.
$student = wp_insert_user(
	array(
		'user_login' => 'paused' . wp_rand( 1000, 9999 ),
		'user_pass'  => wp_generate_password(),
		'user_email' => 'paused' . wp_rand( 1000, 9999 ) . '@example.org',
		'role'       => 'subscriber',
	)
);
wp_set_current_user( $student );
list( $code, $data ) = $request( 'DELETE', '/me' );
wp_set_current_user( 0 );
$check( 'paused: a signed-in student deletes their account (204)', 204 === $code && false === get_userdata( $student ), array( $code, $data ) );
list( $code, $data ) = $request( 'DELETE', '/me' );
$check( 'paused: DELETE /me without a session 401, not 503', 401 === $code, array( $code, $data ) );

// The settings page says so.
ob_start();
$page = new \Yallapp\Admin\Settings_Page( $plugin );
$card = new ReflectionMethod( $page, 'license_card' );
$card->setAccessible( true );
$values = new ReflectionProperty( $page, 'values' );
$values->setAccessible( true );
$values->setValue( $page, $settings->all() );
$card->invoke( $page );
$html = (string) ob_get_clean();
$check( 'paused: the License card says the plan ended and how to renew', false !== strpos( $html, 'Ended on' ) && false !== strpos( $html, 'so the app is paused for everyone' ) && false !== strpos( $html, 'yallapp.com.tr/dashboard/license' ) && false === strpos( $html, 'Test mode' ), $html );

// A suspended account.
$status( 'suspended', gmdate( 'c', time() + DAY_IN_SECONDS ) );
list( $code, $data ) = $request( 'GET', '/config', $config );
$check( 'paused: a suspended account 503 account_suspended', 503 === $code && 'account_suspended' === ( $data['code'] ?? '' ) && isset( $data['contact'] ), array( $code, $data ) );

// Platform unreachable for over 72 hours before the end: paused too, until the next check.
update_option( License_Client::STATUS_OPTION, array( 'status' => 'active', 'expires_at' => gmdate( 'c', time() + 30 * DAY_IN_SECONDS ), 'contacted_at' => time() - 4 * DAY_IN_SECONDS ), false );
$check( 'paused: no answer for 4 days is unreachable', 'unreachable' === $plugin->license()->state(), $plugin->license()->state() );
// The grace before the end: the platform unreachable for a day, the plan still running.
update_option( License_Client::STATUS_OPTION, array( 'status' => 'active', 'expires_at' => gmdate( 'c', time() + 30 * DAY_IN_SECONDS ), 'contacted_at' => time() - DAY_IN_SECONDS, 'features' => array( 'push' ) ), false );
list( $code, $data ) = $request( 'GET', '/config', $config );
$check( 'paused: within the grace and before the end the app answers', 200 === $code && 'active' === $plugin->license()->state(), array( $code, $plugin->license()->state() ) );
$result = $plugin->license()->check();
$check( 'paused: a failed check keeps the last status', is_wp_error( $result ) && 'active' === $plugin->license()->state() && $calls > 0, $result );

// Enforcement off again: the dev site answers without a license.
remove_filter( 'yallapp_enforce_license', $enforce );
delete_option( License_Client::STATUS_OPTION );
$settings->update( $saved );
list( $code, $data ) = $request( 'GET', '/config', $config );
$check( 'paused: back to the dev site\'s own state', 200 === $code && ! License_Client::enforced(), array( $code, $data['code'] ?? null ) );
echo wp_json_encode( array( 'checks' => $checks ) );
