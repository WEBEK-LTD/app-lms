<?php
/**
 * 85.4 Checks of the campaigns Yallapp sends a WordPress site, inside the dev site, with the
 * platform replaced by a pre_http_request filter: POST /campaigns/send takes only Yallapp's
 * signed campaigns, puts one in everyone's inbox with its link and picture, sends the same send
 * once, and the plugin reports the numbers to Yallapp after the last batch. Leaves the site as
 * it found it.
 *
 * Usage: wp eval-file tests/integration/campaign-check.php
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\License\Campaign_Request;
use Yallapp\Plugin;
use Yallapp\Push\Push_Service;

$checks   = array();
$requests = array();
$key      = 'YALL-TEST-0000-0085';
$check    = static function ( $name, $ok, $detail = '' ) use ( &$checks ) {
	$checks[] = array( $name, (bool) $ok, is_string( $detail ) ? $detail : wp_json_encode( $detail ) );
};
add_filter(
	'pre_http_request',
	static function ( $pre, $request, $url ) use ( &$requests ) {
		if ( false !== strpos( $url, '/campaigns/report' ) ) {
			$requests[] = json_decode( (string) $request['body'], true );
			return array(
				'headers'  => array(),
				'body'     => '',
				'response' => array( 'code' => 204, 'message' => '' ),
				'cookies'  => array(),
				'filename' => null,
			);
		}
		return $pre;
	},
	10,
	3
);

$plugin   = Plugin::instance();
$settings = $plugin->settings();
$before   = (string) $settings->get( 'license_key' );
$settings->update( array( 'license_key' => $key ) );
$call = static function ( $raw ) {
	$request = new WP_REST_Request( 'POST', '/yallapp/v1/campaigns/send' );
	$request->set_header( 'Content-Type', 'application/json' );
	$request->set_body( $raw );
	$response = rest_do_request( $request );
	return array( $response->get_status(), $response->get_data() );
};
$send_id  = wp_rand( 100000, 999999 );
$campaign = '{"send_id":' . $send_id . ',"title":"Weekend sale","body":"Everything is 20% off until Sunday.","link":"https://shop.example/sale","image_url":"https://yallapp.com.tr/m/abc123"}';
$body     = static function ( $signed_with ) use ( $campaign ) {
	$timestamp = time();
	return '{"timestamp":' . $timestamp . ',"signature":"' . Campaign_Request::sign( $signed_with, $timestamp, $campaign ) . '","campaign":' . $campaign . '}';
};

list( $status, $data ) = $call( $body( 'YALL-AAAA-BBBB-CCCC' ) );
$check( 'campaign: another key\'s campaign is refused (401)', 401 === $status && 'invalid_signature' === ( $data['code'] ?? '' ), array( $status, $data ) );
list( $status ) = $call( '{"campaign":{}}' );
$check( 'campaign: an unsigned campaign is refused (401)', 401 === $status, $status );

// The reader joins before the campaign: the inbox shows what came from the second someone joined.
$reader = wp_insert_user( array( 'user_login' => 'campaign' . wp_rand( 1000, 9999 ), 'user_pass' => wp_generate_password(), 'role' => 'subscriber' ) );

list( $status, $data ) = $call( $body( $key ) );
$first                 = $data;
$check( 'campaign: a signed campaign is taken (202) with its inbox notification', 202 === $status && ( $data['notification_id'] ?? 0 ) > 0 && isset( $data['people'], $data['batches'] ), array( $status, $data ) );

$inbox  = $plugin->inbox()->for_user( $reader, array(), 1, 20 );
$item   = null;
foreach ( $inbox['items'] as $entry ) {
	if ( (int) $entry['id'] === (int) ( $first['notification_id'] ?? 0 ) ) {
		$item = $entry;
	}
}
$check( 'campaign: in everyone\'s inbox, with what it opens and its picture', null !== $item && 'Weekend sale' === $item['title'] && 'https://shop.example/sale' === $item['link'] && 'https://yallapp.com.tr/m/abc123' === $item['image_url'], $item );

list( $status, $data ) = $call( $body( $key ) );
$check( 'campaign: the same send twice is sent once (200, the first answer)', 200 === $status && ( $data['notification_id'] ?? 0 ) === ( $first['notification_id'] ?? -1 ), array( $status, $data ) );
$count = 0;
foreach ( $plugin->inbox()->for_user( $reader, array(), 1, 50 )['items'] as $entry ) {
	if ( 'Weekend sale' === $entry['title'] ) {
		++$count;
	}
}
$check( 'campaign: one notification in the inbox, not two', 1 === $count, $count );

// The last batch reports the numbers (a batch of nobody: none sent, none missed).
$plugin->push()->send_campaign_batch( $send_id, array(), array( 'title' => 'Weekend sale', 'body' => 'x' ), array( 'type' => 'announcement' ), 1 );
$report = $requests[0] ?? array();
$check( 'campaign: after the last batch, Yallapp gets the numbers with the license', 1 === count( $requests ) && $send_id === ( $report['send_id'] ?? 0 ) && 0 === ( $report['sent'] ?? -1 ) && 0 === ( $report['failed'] ?? -1 ) && $key === ( $report['license_key'] ?? '' ), $requests );

require_once ABSPATH . 'wp-admin/includes/user.php';
wp_delete_user( $reader );
delete_option( Push_Service::CAMPAIGN_OPTION . $send_id );
$settings->update( array( 'license_key' => $before ) );
echo wp_json_encode( array( 'checks' => $checks ) );
