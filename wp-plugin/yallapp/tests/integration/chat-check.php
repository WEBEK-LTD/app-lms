<?php
/**
 * 77 Checks of the chat inside the dev site, with the platform replaced by a pre_http_request
 * filter: Config.chat follows the license status; POST /chat/session gets a token from the
 * platform for the signed-in person (their ID, name, picture and courses), passes on the
 * platform's refusal and says the chat can't be reached when the platform is down;
 * POST /chat/notify takes only Yallapp's signed notifications; deleting an account tells the
 * platform. Leaves the site as it found it.
 *
 * Usage: wp eval-file tests/integration/chat-check.php
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\License\Chat_Notify;
use Yallapp\License\License_Client;
use Yallapp\Plugin;

$checks   = array();
$requests = array();
$key      = 'YALL-TEST-0000-0077';
$platform = array( 'session' => 'ok' );

$check   = static function ( $name, $ok, $detail = '' ) use ( &$checks ) {
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
add_filter(
	'pre_http_request',
	static function ( $pre, $request, $url ) use ( &$requests, &$platform, $respond ) {
		if ( false !== strpos( $url, '/licenses/check' ) ) {
			return $respond(
				200,
				array(
					'status'     => 'active',
					'plan'       => 'pro',
					'features'   => array( 'push', 'chat' ),
					'app_type'   => 'lms',
					'vertical'   => null,
					'chat'       => array(
						'base_url' => 'https://yallapp.test/api/app/00000000-0000-4000-8000-000000000077',
						'groups'   => true,
					),
					'expires_at' => '2099-01-01T00:00:00Z',
					'checked_at' => gmdate( 'c' ),
					'message'    => null,
				)
			);
		}
		if ( false !== strpos( $url, '/apps/layout' ) ) {
			return $respond( 204 );
		}
		if ( false !== strpos( $url, '/chat/sessions' ) ) {
			$requests[] = array( 'session', json_decode( (string) $request['body'], true ) );
			if ( 'refused' === $platform['session'] ) {
				return $respond( 403, array( 'code' => 'chat_not_available', 'message' => "Chat isn't available in this app." ) );
			}
			if ( 'down' === $platform['session'] ) {
				return new WP_Error( 'http_request_failed', 'cURL error 7' );
			}
			return $respond( 200, array( 'token' => 'chat-token-0077', 'expires_at' => '2099-01-01T01:00:00.000Z', 'base_url' => 'https://yallapp.test/api/app/00000000-0000-4000-8000-000000000077' ) );
		}
		if ( false !== strpos( $url, '/chat/members/forget' ) ) {
			$requests[] = array( 'forget', json_decode( (string) $request['body'], true ) );
			return $respond( 204 );
		}
		return $pre;
	},
	10,
	3
);

$plugin   = Plugin::instance();
$settings = $plugin->settings();
$call     = static function ( $method, $route, $body = null, $raw = null ) {
	$request = new WP_REST_Request( $method, '/yallapp/v1' . $route );
	$request->set_header( 'Content-Type', 'application/json' );
	if ( null !== $raw ) {
		$request->set_body( $raw );
	} elseif ( null !== $body ) {
		$request->set_body( wp_json_encode( $body ) );
	}
	$response = rest_do_request( $request );
	return array( $response->get_status(), $response->get_data() );
};
$config   = static function () use ( $call ) {
	$request = new WP_REST_Request( 'GET', '/yallapp/v1/config' );
	$request->set_query_params( array( 'platform' => 'android', 'app_version' => '1.0.0' ) );
	return rest_do_request( $request )->get_data();
};

delete_option( License_Client::STATUS_OPTION );
$settings->update( array( 'license_key' => '' ) );
$check( 'chat: no Config.chat without a license that has it', ! array_key_exists( 'chat', (array) $config() ) );

$student = wp_insert_user( array( 'user_login' => 'chat' . wp_rand( 1000, 9999 ), 'user_pass' => wp_generate_password(), 'display_name' => 'Deniz Aksoy', 'role' => 'subscriber' ) );
wp_set_current_user( $student );
list( $status, $data ) = $call( 'POST', '/chat/session' );
$check( 'chat: no chat session without it (403)', 403 === $status && 'chat_not_available' === ( $data['code'] ?? '' ) && ! $requests, array( $status, $data ) );

$settings->update( array( 'license_key' => $key ) );
$plugin->license()->refresh_now();
$check( 'chat: Config.chat from the license, with the site\'s session', array( 'base_url' => 'https://yallapp.test/api/app/00000000-0000-4000-8000-000000000077', 'session' => 'site', 'groups' => true ) === ( $config()['chat'] ?? null ), $config()['chat'] ?? null );

list( $status, $data ) = $call( 'POST', '/chat/session' );
$sent                  = $requests[0][1] ?? array();
$lms                   = $plugin->lms();
$enrolled              = $lms ? array_map( 'absint', (array) $lms->enrolled_course_ids( $student ) ) : array();
$check( 'chat: a session for the signed-in person', 200 === $status && 'chat-token-0077' === ( $data['token'] ?? '' ) && isset( $data['expires_at'], $data['base_url'] ), array( $status, $data ) );
$check( 'chat: the platform gets their ID, name, picture, courses and the license', $key === ( $sent['license_key'] ?? '' ) && $student === ( $sent['user']['id'] ?? 0 ) && 'Deniz Aksoy' === ( $sent['user']['name'] ?? '' ) && is_array( $sent['courses'] ?? null ) && array_column( $sent['courses'], 'id' ) === array_values( $enrolled ), $sent );

wp_set_current_user( 0 );
list( $status ) = $call( 'POST', '/chat/session' );
$check( 'chat: signed out, no session (401)', 401 === $status, $status );
wp_set_current_user( $student );

$platform['session']   = 'refused';
list( $status, $data ) = $call( 'POST', '/chat/session' );
$check( 'chat: the platform\'s refusal is passed on', 403 === $status && 'chat_not_available' === ( $data['code'] ?? '' ), array( $status, $data ) );
$platform['session']   = 'down';
list( $status, $data ) = $call( 'POST', '/chat/session' );
$check( 'chat: the platform down is 503', 503 === $status && 'chat_unavailable' === ( $data['code'] ?? '' ), array( $status, $data ) );

$notification = '{"user_ids":[' . $student . '],"title":"Ada Academy","body":"Your certificate is ready.","conversation_id":"0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b"}';
$body         = static function ( $signed_with ) use ( $notification ) {
	$timestamp = time();
	return '{"timestamp":' . $timestamp . ',"signature":"' . Chat_Notify::sign( $signed_with, $timestamp, $notification ) . '","notification":' . $notification . '}';
};
list( $status ) = $call( 'POST', '/chat/notify', null, $body( $key ) );
$check( 'chat: a signed notification is taken (202)', 202 === $status, $status );
list( $status, $data ) = $call( 'POST', '/chat/notify', null, $body( 'YALL-AAAA-BBBB-CCCC' ) );
$check( 'chat: another key\'s notification is refused (401)', 401 === $status && 'invalid_signature' === ( $data['code'] ?? '' ), array( $status, $data ) );
list( $status ) = $call( 'POST', '/chat/notify', array( 'notification' => array() ) );
$check( 'chat: an unsigned notification is refused (401)', 401 === $status, $status );

wp_set_current_user( 0 );
require_once ABSPATH . 'wp-admin/includes/user.php';
wp_delete_user( $student );
$forget = array_values( array_filter( $requests, static function ( $r ) { return 'forget' === $r[0]; } ) );
$check( 'chat: deleting the account tells the platform', 1 === count( $forget ) && $student === ( $forget[0][1]['user_id'] ?? 0 ) && $key === ( $forget[0][1]['license_key'] ?? '' ), $forget );

delete_option( License_Client::STATUS_OPTION );
$plugin->layout_client()->forget();
$settings->update( array( 'license_key' => '' ) );
echo wp_json_encode( array( 'checks' => $checks ) );
