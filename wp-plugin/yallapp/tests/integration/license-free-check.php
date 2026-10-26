<?php
/**
 * The plugin works whatever the Yallapp license's state (WordPress.org guideline 5): with no
 * key, an ended plan, a suspended account or a plan without offline mode, the app's API answers
 * (`/config` included), people sign in, push follows the site's own keys and offline downloads
 * follow the owner's setting. Chat, which runs on Yallapp's servers, needs the connection. The
 * owner's maintenance switch still stops the API. The settings page says the plugin keeps
 * working. The platform is reached only for its own services (a sign-in code it would send);
 * here it is unreachable (pre_http_request).
 * Leaves the site as it found it.
 *
 * Usage: wp eval-file tests/integration/license-free-check.php
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

$calls = array();
add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) use ( &$calls ) {
		if ( 0 === strpos( $url, License_Client::base_url() ) ) {
			$calls[] = substr( $url, strlen( License_Client::base_url() ) );
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
	'license_key'         => (string) $settings->get( 'license_key' ),
	'app_name'            => (string) $settings->get( 'app_name' ),
	'offline_downloads'   => (bool) $settings->get( 'offline_downloads' ),
	'maintenance'         => (bool) $settings->get( 'maintenance' ),
	'maintenance_message' => (string) $settings->get( 'maintenance_message' ),
);
$saved_status = get_option( License_Client::STATUS_OPTION, null );

$settings->update(
	array(
		'license_key'       => 'YALL-TEST-0000-0076',
		'app_name'          => 'Ada Academy',
		'offline_downloads' => true,
	)
);
$status = static function ( $state, $expires_at, array $extra = array() ) {
	update_option(
		License_Client::STATUS_OPTION,
		array_merge(
			array(
				'status'       => $state,
				'plan'         => 'starter',
				'features'     => array(),
				'expires_at'   => $expires_at,
				'checked_at'   => gmdate( 'c' ),
				'contacted_at' => time(),
			),
			$extra
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

// A plan the platform said was active, which ended an hour ago, without push or offline mode
// in its features, and with a chat address from before.
$status(
	'active',
	gmdate( 'c', time() - HOUR_IN_SECONDS ),
	array(
		'chat' => array(
			'base_url' => 'https://yallapp.test/api/app/00000000-0000-4000-8000-000000000076',
			'groups'   => false,
		),
	)
);
$check( 'license-free: the plan ended', 'expired' === $plugin->license()->state() && ! $plugin->license()->is_active(), $plugin->license()->state() );
list( $code, $data ) = $request( 'GET', '/config', $config );
$check( 'license-free: /config answers with an ended plan', 200 === $code && empty( $data['app']['maintenance'] ), array( $code, $data['code'] ?? null ) );
$check( 'license-free: push follows the site\'s own keys', ( $data['features']['push'] ?? null ) === $plugin->push()->is_configured(), $data['features'] ?? null );
$check( 'license-free: offline mode is on', true === ( $data['features']['offline'] ?? null ), $data['features'] ?? null );
$check( 'license-free: offline downloads follow the owner\'s setting', ( null === $plugin->lms() ) || true === ( $data['features']['downloads'] ?? null ), $data['features'] ?? null );
$check( 'license-free: chat, on Yallapp\'s servers, needs the connection', ! array_key_exists( 'chat', (array) $data ), $data['chat'] ?? null );
list( $code, $data ) = $request( 'GET', '/courses' );
$check( 'license-free: content routes answer', 200 === $code, array( $code, $data['code'] ?? null ) );
$r = new WP_REST_Request( 'POST', '/yallapp/v1/auth/otp/request' );
$r->set_header( 'Content-Type', 'application/json' );
$r->set_body( wp_json_encode( array( 'country_code' => '+90', 'phone' => '5321234576' ) ) );
$response = rest_do_request( $r );
$check( 'license-free: signing in isn\'t stopped', 503 !== $response->get_status() && 'license_inactive' !== ( $response->get_data()['code'] ?? '' ), array( $response->get_status(), $response->get_data() ) );

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
$check( 'license-free: the License card says the plan ended and the plugin keeps working', false !== strpos( $html, 'Ended on' ) && false !== strpos( $html, 'Everything the plugin does on this site keeps working.' ) && false === strpos( $html, 'paused' ) && false !== strpos( $html, 'yallapp.com.tr/dashboard/license' ), $html );

// A suspended account, a key that isn't valid, no answer for days, and no key at all.
foreach ( array( 'suspended', 'invalid' ) as $state ) {
	$status( $state, gmdate( 'c', time() + DAY_IN_SECONDS ) );
	list( $code, $data ) = $request( 'GET', '/config', $config );
	$check( 'license-free: /config answers when the license is ' . $state, 200 === $code, array( $code, $data['code'] ?? null ) );
}
update_option( License_Client::STATUS_OPTION, array( 'status' => 'active', 'expires_at' => gmdate( 'c', time() + 30 * DAY_IN_SECONDS ), 'contacted_at' => time() - 4 * DAY_IN_SECONDS ), false );
list( $code ) = $request( 'GET', '/courses' );
$check( 'license-free: no answer from Yallapp for 4 days, the API still answers', 'unreachable' === $plugin->license()->state() && 200 === $code, array( $plugin->license()->state(), $code ) );
delete_option( License_Client::STATUS_OPTION );
$settings->update( array( 'license_key' => '' ) );
list( $code, $data ) = $request( 'GET', '/config', $config );
$check( 'license-free: /config answers without a license', 200 === $code && true === ( $data['features']['offline'] ?? null ), array( $code, $data['code'] ?? null ) );

// The owner's own maintenance switch still stops the API (but not /config).
$settings->update(
	array(
		'maintenance'         => true,
		'maintenance_message' => 'Back at noon.',
	)
);
list( $code, $data ) = $request( 'GET', '/courses' );
$check( 'license-free: maintenance 503 on content routes', 503 === $code && 'maintenance' === ( $data['code'] ?? '' ) && ! isset( $data['contact'] ), array( $code, $data ) );
list( $code, $data ) = $request( 'GET', '/config', $config );
$check( 'license-free: /config says maintenance', 200 === $code && true === ( $data['app']['maintenance'] ?? null ) && 'Back at noon.' === ( $data['app']['maintenance_message'] ?? null ), array( $code, $data['app'] ?? null ) );
$check( 'license-free: Yallapp is asked only for its own services', array() === array_diff( $calls, array( '/sign-in-codes/send' ) ), $calls );

// Back as it was.
$settings->update( $saved );
if ( null === $saved_status ) {
	delete_option( License_Client::STATUS_OPTION );
} else {
	update_option( License_Client::STATUS_OPTION, $saved_status, false );
}
list( $code ) = $request( 'GET', '/config', $config );
$check( 'license-free: back to the site\'s own state', 200 === $code, $code );
echo wp_json_encode( array( 'checks' => $checks ) );
