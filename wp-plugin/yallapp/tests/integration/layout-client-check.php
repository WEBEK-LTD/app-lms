<?php
/**
 * Checks of the layout client (POST /apps/layout) inside the dev site, with the platform
 * replaced by a pre_http_request filter: 200, 304, 204, failures, the inactive license and
 * license activation. Leaves the given layout stored, for the /pages checks that follow.
 *
 * Usage: wp eval-file tests/integration/layout-client-check.php <layout.json>
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\Pages\Layout_Client;
use Yallapp\Plugin;

$yallapp_layout = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
$checks         = array();
$requests       = array();
$reply          = null;

$check = static function ( $name, $ok, $detail = '' ) use ( &$checks ) {
	$checks[] = array( $name, (bool) $ok, is_string( $detail ) ? $detail : wp_json_encode( $detail ) );
};

// The fake platform: records each request and answers with $reply (a response array or a WP_Error).
add_filter(
	'pre_http_request',
	static function ( $pre, $request, $url ) use ( &$requests, &$reply ) {
		$requests[] = array(
			'url'     => $url,
			'method'  => $request['method'],
			'headers' => $request['headers'],
			'body'    => json_decode( (string) $request['body'], true ),
		);
		return null !== $reply ? $reply : $pre;
	},
	10,
	3
);
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

$plugin   = Plugin::instance();
$client   = $plugin->layout_client();
$settings = $plugin->settings();
delete_option( Layout_Client::OPTION );

// No license key: nothing is asked.
$settings->update( array( 'license_key' => '' ) );
delete_option( 'yallapp_license' );
$result = $client->refresh();
$check( 'layout: no license key, no request', is_wp_error( $result ) && 'license_missing' === $result->get_error_code() && ! $requests, $requests );

// A key whose license isn't active: nothing is asked either.
$settings->update( array( 'license_key' => 'YALL-TEST-0000-0001' ) );
update_option( 'yallapp_license', array( 'status' => 'expired', 'contacted_at' => time() ), false );
$result = $client->refresh();
$check( 'layout: inactive license, no request', is_wp_error( $result ) && 'license_inactive' === $result->get_error_code() && ! $requests, $requests );

// Activation fetches the layout right away.
$reply = null;
add_filter(
	'pre_http_request',
	static function ( $pre, $request, $url ) use ( &$reply, $respond, $yallapp_layout ) {
		if ( false !== strpos( $url, '/licenses/activate' ) ) {
			return $respond( 200, array( 'status' => 'active', 'plan' => 'pro', 'features' => array(), 'checked_at' => gmdate( 'c' ) ) );
		}
		if ( false !== strpos( $url, '/apps/layout' ) && null === $reply ) {
			return $respond( 200, $yallapp_layout );
		}
		return $pre;
	},
	5,
	3
);
$status   = $plugin->license()->activate( 'YALL-TEST-0000-0001' );
$last     = end( $requests );
$state    = $client->state();
$check( 'layout: activation fetches the layout', is_array( $status ) && 'active' === $status['status'] && $last && false !== strpos( $last['url'], '/apps/layout' ) && $state['layout'] && $yallapp_layout['version'] === $state['layout']['version'], array( $status, $last, $state ) );
$check( 'layout: request is POST with SiteInfo', $last && '/api/v1/apps/layout' === substr( $last['url'], -19 ) && 'POST' === $last['method'] && 'YALL-TEST-0000-0001' === ( $last['body']['license_key'] ?? '' ) && ! empty( $last['body']['site_url'] ) && YALLAPP_VERSION === ( $last['body']['plugin_version'] ?? '' ) && ! isset( $last['headers']['If-None-Match'] ), $last );
$check( 'layout: stored without autoload', 'no' === $GLOBALS['wpdb']->get_var( $GLOBALS['wpdb']->prepare( "SELECT autoload FROM {$GLOBALS['wpdb']->options} WHERE option_name = %s", Layout_Client::OPTION ) ) || 'off' === $GLOBALS['wpdb']->get_var( $GLOBALS['wpdb']->prepare( "SELECT autoload FROM {$GLOBALS['wpdb']->options} WHERE option_name = %s", Layout_Client::OPTION ) ) );

// 304: the copy stays; If-None-Match carries the stored version.
$reply  = $respond( 304 );
$result = $client->refresh();
$last   = end( $requests );
$check( 'layout: 304 keeps the copy', 'unchanged' === $result && $yallapp_layout['version'] === ( $client->layout()['version'] ?? '' ), $result );
$check( 'layout: If-None-Match sends the stored version', $yallapp_layout['version'] === ( $last['headers']['If-None-Match'] ?? '' ), $last['headers'] );

// Failures keep the copy and note the error.
$reply  = new WP_Error( 'http_request_failed', 'timeout' );
$result = $client->refresh();
$state  = $client->state();
$check( 'layout: network failure keeps the copy', is_wp_error( $result ) && $yallapp_layout['version'] === ( $state['layout']['version'] ?? '' ) && '' !== (string) $state['error'], $state['error'] );
$reply  = $respond( 500, array( 'code' => 'server_error', 'message' => 'Down' ) );
$result = $client->refresh();
$check( 'layout: 500 keeps the copy', is_wp_error( $result ) && $yallapp_layout['version'] === ( $client->layout()['version'] ?? '' ), $result );
$reply  = $respond( 403, array( 'code' => 'license_inactive', 'message' => 'The license is not active.' ) );
$result = $client->refresh();
$check( 'layout: 403 keeps the copy', is_wp_error( $result ) && 'license_inactive' === $result->get_error_code() && $client->layout(), $result );
$reply  = $respond( 200, array( 'version' => 'broken' ) );
$result = $client->refresh();
$check( 'layout: unreadable layout keeps the copy', is_wp_error( $result ) && $yallapp_layout['version'] === ( $client->layout()['version'] ?? '' ), $result );

// 204: nothing published, the app gets the default pages.
$reply  = $respond( 204 );
$result = $client->refresh();
$state  = $client->state();
$check( 'layout: 204 clears the copy', 'cleared' === $result && null === $state['layout'] && $state['fetched_at'] > 0 && null === $state['error'], $state );

// 200: a new layout replaces the copy.
$reply  = $respond( 200, $yallapp_layout );
$result = $client->refresh();
$check( 'layout: 200 stores the layout', 'updated' === $result && $yallapp_layout['version'] === ( $client->layout()['version'] ?? '' ), $result );
$check( 'layout: refresh runs every 15 minutes', false !== wp_next_scheduled( Layout_Client::HOOK ) && 900 === ( wp_get_schedules()[ Layout_Client::SCHEDULE ]['interval'] ?? 0 ) );

// Leave the layout stored, without a license, for the HTTP checks (licenses aren't enforced on the dev site).
$settings->update( array( 'license_key' => '' ) );
delete_option( 'yallapp_license' );

echo wp_json_encode( array( 'checks' => $checks ) );
