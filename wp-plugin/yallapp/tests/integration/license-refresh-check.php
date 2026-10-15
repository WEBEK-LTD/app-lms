<?php
/**
 * 31 Checks of POST /license/refresh inside the dev site, with the platform replaced by a
 * pre_http_request filter: a signed nudge runs the license check and the layout fetch; a wrong
 * signature, an old timestamp, a site without a key and a missing body are refused without
 * calling the platform; a second nudge within 30 seconds gets 429 and one check is scheduled.
 * Leaves the site as it found it: no license, so the HTTP checks keep the development code.
 *
 * Usage: wp eval-file tests/integration/license-refresh-check.php
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\License\License_Client;
use Yallapp\License\Refresh_Signature;
use Yallapp\Plugin;
use Yallapp\Rest\License_Controller;

$checks   = array();
$requests = array();
$key      = 'YALL-TEST-0000-0031';

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
// The fake platform: the license check says the owner made this a Store app; nothing is published.
add_filter(
	'pre_http_request',
	static function ( $pre, $request, $url ) use ( &$requests, $respond ) {
		if ( false !== strpos( $url, '/licenses/check' ) ) {
			$requests[] = array( 'check', json_decode( (string) $request['body'], true ) );
			return $respond(
				200,
				array(
					'status'          => 'active',
					'plan'            => 'growth',
					'features'        => array( 'push' ),
					'sign_in_methods' => array( 'phone' ),
					'email_sign_in'   => null,
					'app_type'        => 'store',
					'vertical'        => null,
					'expires_at'      => '2099-01-01T00:00:00Z',
					'checked_at'      => gmdate( 'c' ),
					'message'         => null,
				)
			);
		}
		if ( false !== strpos( $url, '/apps/layout' ) ) {
			$requests[] = array( 'layout', null );
			return $respond( 204 );
		}
		return $pre;
	},
	10,
	3
);

$plugin   = Plugin::instance();
$settings = $plugin->settings();
$nudge    = static function ( $body ) {
	$request = new WP_REST_Request( 'POST', '/yallapp/v1/license/refresh' );
	$request->set_header( 'Content-Type', 'application/json' );
	if ( null !== $body ) {
		$request->set_body( wp_json_encode( $body ) );
	}
	$response = rest_do_request( $request );
	return array( $response->get_status(), $response->get_data() );
};
$signed   = static function ( $timestamp, $with = null ) use ( $key ) {
	return array(
		'timestamp' => $timestamp,
		'signature' => Refresh_Signature::sign( null === $with ? $key : $with, $timestamp ),
	);
};
$reset    = static function () use ( $plugin ) {
	delete_transient( License_Controller::LAST );
	wp_clear_scheduled_hook( License_Client::REFRESH_HOOK );
	delete_option( License_Client::STATUS_OPTION );
	$plugin->layout_client()->forget();
};

$reset();
$settings->update( array( 'license_key' => '' ) );
list( $status, $data ) = $nudge( $signed( time() ) );
$check( 'refresh: a site without a license key refuses 401', 401 === $status && 'invalid_signature' === ( $data['code'] ?? '' ) && ! $requests, array( $status, $data ) );

$settings->update( array( 'license_key' => $key ) );
list( $status, $data ) = $nudge( $signed( time(), 'YALL-AAAA-BBBB-CCCC' ) );
$check( 'refresh: a wrong signature refuses 401 and asks nothing', 401 === $status && 'invalid_signature' === ( $data['code'] ?? '' ) && ! $requests, array( $status, $data ) );
list( $status, $data ) = $nudge( $signed( time() - 600 ) );
$check( 'refresh: a timestamp 10 minutes old refuses 401', 401 === $status && 'invalid_signature' === ( $data['code'] ?? '' ) && ! $requests, array( $status, $data ) );
list( $status, $data ) = $nudge( null );
$check( 'refresh: no body is a bad request', 400 === $status && 'invalid_request' === ( $data['code'] ?? '' ) && ! $requests, array( $status, $data ) );

list( $status, $data ) = $nudge( $signed( time() ) );
$state                 = $plugin->license()->status();
$kinds                 = array_column( $requests, 0 );
$check( 'refresh: a signed nudge 202 with the new status', 202 === $status && 'active' === ( $data['status'] ?? '' ), array( $status, $data ) );
$check( 'refresh: the plugin ran its license check and fetched the layout', array( 'check', 'layout' ) === $kinds && $key === ( $requests[0][1]['license_key'] ?? '' ), $kinds );
$check( 'refresh: the owner\'s new app type reached the site', 'store' === $state['app_type'] && 'active' === $state['status'], $state );

list( $status, $data ) = $nudge( $signed( time() ) );
$check( 'refresh: a second nudge within 30 seconds 429', 429 === $status && 'rate_limited' === ( $data['code'] ?? '' ) && ( $data['retry_after_seconds'] ?? 0 ) >= 1 && 2 === count( $requests ), array( $status, $data ) );
$next = wp_next_scheduled( License_Client::REFRESH_HOOK );
$check( 'refresh: one check is scheduled for when the 30 seconds are over', false !== $next && $next <= time() + 30, $next );
$nudge( $signed( time() ) );
$check( 'refresh: still one scheduled check', 1 === count( array_filter( _get_cron_array(), static function ( $hooks ) { return isset( $hooks[ License_Client::REFRESH_HOOK ] ); } ) ), _get_cron_array() );

$settings->update( array( 'maintenance' => true ) );
delete_transient( License_Controller::LAST );
list( $status, $data ) = $nudge( $signed( time() ) );
$check( 'refresh: reachable in maintenance mode', 202 === $status, array( $status, $data ) );
$settings->update( array( 'maintenance' => false ) );

$reset();
$settings->update( array( 'license_key' => '' ) );
echo wp_json_encode( array( 'checks' => $checks ) );
