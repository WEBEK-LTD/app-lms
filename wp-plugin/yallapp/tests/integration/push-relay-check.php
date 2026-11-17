<?php
/**
 * 136.40 Checks of "Notifications are sent by Yallapp" inside the dev site, with the platform
 * replaced by a pre_http_request filter: the license's `push` flag, a batch handed to
 * POST /push/send instead of Firebase, each token's answer (sent, forgotten, sent again from
 * cron), the platform's limits and a mode change, and the settings page without the Firebase
 * file. Leaves the site as it found it.
 *
 * Usage: wp eval-file tests/integration/push-relay-check.php
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\Admin\Settings_Page;
use Yallapp\License\License_Client;
use Yallapp\Plugin;
use Yallapp\Push\Push_Service;

$checks   = array();
$requests = array();
$google   = array();
$reply    = null;
$key      = 'YALL-TEST-0000-0136';
$check    = static function ( $name, $ok, $detail = '' ) use ( &$checks ) {
	$checks[] = array( $name, (bool) $ok, is_string( $detail ) ? $detail : wp_json_encode( $detail ) );
};
$respond  = static function ( $code, $body = '' ) {
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
// The fake platform: each batch is recorded; "relay-ok-*" is sent, "relay-gone-*" is invalid, the rest retry,
// unless $reply says otherwise. Any call to Google is recorded too (there must be none).
add_filter(
	'pre_http_request',
	static function ( $pre, $request, $url ) use ( &$requests, &$google, &$reply, $respond ) {
		if ( false !== strpos( $url, 'googleapis.com' ) ) {
			$google[] = $url;
			return $respond( 500, '' );
		}
		if ( false !== strpos( $url, '/licenses/check' ) ) {
			return $respond(
				200,
				array(
					'status'     => 'active',
					'plan'       => 'growth',
					'features'   => array( 'push' ),
					'push'       => 'yallapp',
					'checked_at' => gmdate( 'c' ),
					'expires_at' => gmdate( 'c', time() + 30 * DAY_IN_SECONDS ),
				)
			);
		}
		if ( false === strpos( $url, '/push/send' ) ) {
			return $pre;
		}
		$body       = json_decode( (string) $request['body'], true );
		$requests[] = array(
			'url'     => $url,
			'method'  => $request['method'],
			'timeout' => $request['timeout'],
			'body'    => $body,
		);
		if ( null !== $reply ) {
			return $reply;
		}
		$results = array();
		foreach ( (array) ( $body['tokens'] ?? array() ) as $entry ) {
			$token     = (string) $entry['token'];
			$results[] = array(
				'token'  => $token,
				'status' => 0 === strpos( $token, 'relay-ok-' ) ? 'sent' : ( 0 === strpos( $token, 'relay-gone-' ) ? 'invalid' : ( 0 === strpos( $token, 'relay-apns-' ) ? 'skipped' : 'retry' ) ),
			);
		}
		return $respond(
			200,
			array(
				'results' => $results,
				'sent'    => 0,
				'invalid' => 0,
				'retry'   => 0,
			)
		);
	},
	10,
	3
);

$plugin   = Plugin::instance();
$settings = $plugin->settings();
$license  = $plugin->license();
$push     = $plugin->push();
$before   = array(
	'key'     => (string) $settings->get( 'license_key' ),
	'status'  => get_option( License_Client::STATUS_OPTION ),
	'account' => (string) $settings->get( 'firebase_service_account' ),
);
$status   = static function ( $mode ) {
	update_option(
		License_Client::STATUS_OPTION,
		array(
			'status'       => 'active',
			'plan'         => 'growth',
			'features'     => array( 'push' ),
			'push'         => $mode,
			'contacted_at' => time(),
		),
		false
	);
};
$clear_cron = static function () {
	wp_unschedule_hook( Push_Service::RETRY_HOOK );
	wp_unschedule_hook( License_Client::REFRESH_HOOK );
};
$retries = static function () {
	$found = array();
	foreach ( (array) _get_cron_array() as $time => $hooks ) {
		foreach ( (array) ( $hooks[ Push_Service::RETRY_HOOK ] ?? array() ) as $event ) {
			$found[] = array(
				'at'   => (int) $time,
				'args' => $event['args'],
			);
		}
	}
	return $found;
};

$settings->update(
	array(
		'license_key'              => $key,
		'firebase_service_account' => '',
	)
);
$clear_cron();

// The flag: own by default, yallapp only when the platform says so.
$status( 'own' );
$check( 'relay: a site with its own Firebase (the default) doesn\'t relay', ! $push->relayed() && ! $push->is_configured() );
delete_option( License_Client::STATUS_OPTION );
$check( 'relay: a stored status from before 0.4.48 means the site\'s own Firebase', 'own' === $license->status()['push'] );
$checked = $license->check();
$check( 'relay: the license check keeps push: yallapp', is_array( $checked ) && 'yallapp' === ( $checked['push'] ?? '' ) && $push->relayed(), $checked );
$check( 'relay: push is set up with no Firebase file on the site', $push->is_configured() );
// 136.46 The app's iPhones register their APNs token while Yallapp sends the notifications.
$config = static function () {
	$request = new WP_REST_Request( 'GET', '/yallapp/v1/config' );
	$request->set_query_params(
		array(
			'platform'    => 'ios',
			'app_version' => '1.0.0',
		)
	);
	return rest_do_request( $request )->get_data();
};
$features = $config()['features'] ?? array();
$check( 'relay: the app config says features.apns while Yallapp sends', true === ( $features['apns'] ?? null ), $features );

// Three people with phones: one delivered, one gone, one to send again.
$people = array();
foreach ( array( 'relay-ok-1', 'relay-gone-1', 'relay-busy-1', 'relay-apns-1' ) as $index => $token ) {
	$user = wp_insert_user(
		array(
			'user_login' => 'relay' . $index . wp_rand( 1000, 9999 ),
			'user_pass'  => wp_generate_password(),
			'role'       => 'subscriber',
		)
	);
	$row  = $plugin->devices()->register(
		$user,
		array(
			'id'          => 'relay-device-' . $index . '-' . wp_rand(),
			'platform'    => 'android',
			'name'        => 'Relay check',
			'app_version' => '1.0.0',
		)
	);
	// 136.46 The iPhone registered its APNs token.
	$plugin->devices()->set_push( $row, $token, array( 'announcements' => true ), 0 === strpos( $token, 'relay-apns-' ) ? 'apns' : 'fcm' );
	$people[] = (int) $user;
}

$notification = array(
	'title' => 'Weekend sale',
	'body'  => 'Everything is 20% off until Sunday.',
	'image' => 'https://yallapp.com.tr/m/abc123',
);
$data         = array(
	'type'            => 'announcement',
	'notification_id' => '7',
);
$sent         = $push->send_batch( $people, 'announcements', $notification, $data );
$last         = end( $requests );
$tokens       = array_column( (array) ( $last['body']['tokens'] ?? array() ), 'token' );
sort( $tokens );
$check( 'relay: the batch goes to POST /push/send, not to Firebase', 1 === count( $requests ) && '/api/v1/push/send' === substr( $last['url'], -17 ) && 'POST' === $last['method'] && ! $google, array( $requests, $google ) );
$check(
	'relay: with the license key, the site, each token with its provider, the notification and the data',
	$key === ( $last['body']['license_key'] ?? '' ) && ! empty( $last['body']['site_url'] ) && YALLAPP_VERSION === ( $last['body']['plugin_version'] ?? '' )
		&& array( 'relay-apns-1', 'relay-busy-1', 'relay-gone-1', 'relay-ok-1' ) === $tokens
		&& array( 'relay-apns-1' => 'apns', 'relay-busy-1' => 'fcm', 'relay-gone-1' => 'fcm', 'relay-ok-1' => 'fcm' ) === ( static function ( $rows ) { $by = array_column( $rows, 'provider', 'token' ); ksort( $by ); return $by; } )( $last['body']['tokens'] )
		&& $notification === ( $last['body']['notification'] ?? null ) && $data === ( $last['body']['data'] ?? null ),
	$last['body'] ?? null
);
$check( 'relay: only what sending needs goes with it (no site report)', ! isset( $last['body']['link_paths'], $last['body']['brand'], $last['body']['adapters'], $last['body']['sales'] ), array_keys( (array) ( $last['body'] ?? array() ) ) );
$check( 'relay: the plugin waits up to 25 seconds', 25 === (int) $last['timeout'], $last['timeout'] );
$check( 'relay: the delivered token counts as sent', 1 === $sent, $sent );
$left = array_column( $plugin->devices()->push_targets( $people, 'announcements' ), 'token' );
sort( $left );
$check( 'relay: an invalid token is forgotten, a skipped iPhone token kept', array( 'relay-apns-1', 'relay-busy-1', 'relay-ok-1' ) === $left, $left );
$queued = $retries();
$check(
	'relay: a token to retry is sent again from cron a minute later, once',
	1 === count( $queued ) && array( array( array( 'token' => 'relay-busy-1', 'provider' => 'fcm' ) ), $notification, $data, 1 ) === $queued[0]['args'] && $queued[0]['at'] >= time() + 50 && $queued[0]['at'] <= time() + 70,
	$queued
);

// The retries stop after the third.
$clear_cron();
$push->retry_tokens( array( 'relay-busy-1' ), $notification, $data, 2 );
$queued = $retries();
$check( 'relay: the third retry is four minutes later', 1 === count( $queued ) && 3 === $queued[0]['args'][3] && $queued[0]['at'] >= time() + 230, $queued );
$clear_cron();
$push->retry_tokens( array( 'relay-busy-1' ), $notification, $data, 3 );
$check( 'relay: after the third retry a token is given up', array() === $retries(), $retries() );

// Over a limit: everything waits as long as the platform says.
$reply = $respond(
	429,
	array(
		'code'                => 'rate_limited',
		'message'             => 'Too many notification batches. Try again shortly.',
		'retry_after_seconds' => 120,
	)
);
$count = count( $requests );
$sent  = $push->send_batch( $people, 'announcements', $notification, $data );
$queued = $retries();
$check( 'relay: over the limit nothing counts as sent and the batch waits for Retry-After', 0 === $sent && $count + 1 === count( $requests ) && 1 === count( $queued ) && 3 === count( $queued[0]['args'][0] ) && $queued[0]['at'] >= time() + 110, $queued );
$clear_cron();

// Can't reach Yallapp: sent again later, nothing forgotten.
$reply = new WP_Error( 'http_request_failed', 'Operation timed out after 25001 milliseconds' );
$sent  = $push->send_batch( $people, 'announcements', $notification, $data );
$check( 'relay: a timeout sends the batch again later and forgets no one', 0 === $sent && 1 === count( $retries() ) && 3 === count( $plugin->devices()->push_targets( $people, 'announcements' ) ), $retries() );
$clear_cron();

// The app went back to its own Firebase: the license is checked soon and the batch retried.
$reply = $respond(
	409,
	array(
		'code'    => 'push_own_firebase',
		'message' => 'This app sends notifications with its own Firebase, from the site.',
	)
);
$push->send_batch( $people, 'announcements', $notification, $data );
$check( 'relay: push_own_firebase asks for a license check and keeps the batch', false !== wp_next_scheduled( License_Client::REFRESH_HOOK ) && 1 === count( $retries() ), $retries() );
$clear_cron();

// A plan without push or an inactive license: dropped, not retried.
$reply = $respond(
	403,
	array(
		'code'    => 'license_inactive',
		'message' => 'This license isn\'t active on this site.',
	)
);
$push->send_batch( $people, 'announcements', $notification, $data );
$check( 'relay: a refused batch isn\'t retried', array() === $retries(), $retries() );
$reply = null;

// The settings page: no Firebase file in Yallapp's mode.
$admins = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
		'fields' => 'ID',
	)
);
wp_set_current_user( (int) ( $admins[0] ?? 1 ) );
$page = new Settings_Page( $plugin );
ob_start();
$page->render();
$html = (string) ob_get_clean();
$check( 'relay: the settings page says notifications are sent by Yallapp', false !== strpos( $html, 'Notifications are sent by Yallapp' ) && false === strpos( $html, 'name="yallapp_firebase"' ) );
$status( 'own' );
ob_start();
$page->render();
$html = (string) ob_get_clean();
$check( 'relay: with its own Firebase the file field is back', false === strpos( $html, 'Notifications are sent by Yallapp' ) && false !== strpos( $html, 'name="yallapp_firebase"' ) );
$features = $config()['features'] ?? array();
$check( 'relay: with its own Firebase the app config has no features.apns', false === ( $features['apns'] ?? null ), $features );

// Leave the site as it was.
$clear_cron();
require_once ABSPATH . 'wp-admin/includes/user.php';
foreach ( $people as $user ) {
	wp_delete_user( $user );
}
$settings->update(
	array(
		'license_key'              => $before['key'],
		'firebase_service_account' => $before['account'],
	)
);
if ( false === $before['status'] ) {
	delete_option( License_Client::STATUS_OPTION );
} else {
	update_option( License_Client::STATUS_OPTION, $before['status'], false );
}

echo wp_json_encode( array( 'checks' => $checks ) );
