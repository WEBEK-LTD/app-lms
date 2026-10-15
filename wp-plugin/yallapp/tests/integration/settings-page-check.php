<?php
/**
 * 31 Checks of the plugin's settings page inside the dev site: it shows the settings for the
 * app type chosen in the Yallapp dashboard (from the license status), else for the type the
 * site's plugins suggest, and never the course settings in another type's app.
 * Leaves the site as it found it (no license status).
 *
 * Usage: wp eval-file tests/integration/settings-page-check.php
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\Admin\Settings_Page;
use Yallapp\License\License_Client;
use Yallapp\Plugin;

$checks = array();
$check  = static function ( $name, $ok, $detail = '' ) use ( &$checks ) {
	$checks[] = array( $name, (bool) $ok, is_string( $detail ) ? $detail : wp_json_encode( $detail ) );
};

$admins = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
		'fields' => 'ID',
	)
);
wp_set_current_user( (int) ( $admins[0] ?? 1 ) );
$page   = new Settings_Page( Plugin::instance() );
$render = static function ( $app_type ) use ( $page ) {
	if ( null === $app_type ) {
		delete_option( License_Client::STATUS_OPTION );
	} else {
		update_option( License_Client::STATUS_OPTION, array( 'status' => 'active', 'app_type' => $app_type, 'contacted_at' => time() ), false );
	}
	ob_start();
	$page->render();
	return (string) ob_get_clean();
};
$cards  = static function ( $html ) {
	preg_match_all( '/<section class="ya-card"><h2>([^<]*?) ?(?:<|$)/', $html, $m );
	return array_map(
		static function ( $title ) {
			return html_entity_decode( trim( $title ), ENT_QUOTES );
		},
		$m[1]
	);
};
$course = array( 'Purchases', 'Video & content protection', 'Lesson content (HTML & code)', 'App home screen' );

// The Tutor LMS site without a choice from the dashboard: an Academy app.
$html  = $render( null );
$found = $cards( $html );
$check( 'settings page: an LMS site without a choice shows the course settings', ! array_diff( $course, $found ) && false !== strpos( $html, 'A new lesson is added to an enrolled course' ), $found );

// The owner made it a Store app (Phase 30's site: Tutor LMS and WooCommerce): no course settings.
$html  = $render( 'store' );
$found = $cards( $html );
$check( 'settings page: a Store app shows no course settings', ! array_intersect( $course, $found ) && false === strpos( $html, 'Enroll now' ) && false === strpos( $html, 'A new lesson is added' ) && false === strpos( $html, 'Students of ' ), $found );
$check( 'settings page: a Store app shows its shop and checkout', in_array( 'Store app', $found, true ) && in_array( 'Checkout', $found, true ) && false !== strpos( $html, 'with the customer signed in' ), $found );

$html  = $render( 'news' );
$found = $cards( $html );
$check( 'settings page: a News app shows its own settings only', in_array( 'News & blog', $found, true ) && ! array_intersect( array_merge( $course, array( 'Store app', 'Checkout' ) ), $found ) && false !== strpos( $html, 'Notify app users about new posts' ) && false === strpos( $html, 'An instructor posts' ), $found );

$html  = $render( 'booking' );
$found = $cards( $html );
$check( 'settings page: a Bookings app shows its own settings only', in_array( 'Bookings app', $found, true ) && ! array_intersect( array_merge( $course, array( 'Store app', 'News & blog' ) ), $found ), $found );

$html  = $render( 'lms' );
$found = $cards( $html );
$check( 'settings page: an Academy app shows the course settings, not the shop', ! array_diff( $course, $found ) && ! in_array( 'Store app', $found, true ), $found );

delete_option( License_Client::STATUS_OPTION );
echo wp_json_encode( array( 'checks' => $checks ) );
