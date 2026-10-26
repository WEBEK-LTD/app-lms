<?php
/**
 * 76.6 Updates from Yallapp inside the dev site, with the platform replaced by a
 * pre_http_request filter: while the plan is active a newer release (GET /plugin/update) shows
 * in WordPress's update list and "View version details", asked once per 12 hours and again after
 * a license check; an ended plan, a release that isn't newer and Yallapp's 204 offer nothing, and
 * an ended plan doesn't even ask. Leaves the site as it found it.
 *
 * Usage: wp eval-file tests/integration/self-update-check.php
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

$asked   = array();
$release = array(
	'version'        => '9.9.9',
	'download_url'   => 'https://yallapp.com.tr/api/v1/plugin/download?token=test',
	'requires'       => '6.0',
	'requires_php'   => '7.4',
	'tested'         => '7.1',
	'changelog_html' => '<ul><li>Better things</li></ul>',
);
add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) use ( &$asked, &$release ) {
		if ( 0 !== strpos( $url, License_Client::base_url() ) ) {
			return $pre;
		}
		$asked[] = $url;
		if ( false === strpos( $url, '/plugin/update' ) ) {
			return new WP_Error( 'http_request_failed', 'Only the update is answered in this check.' );
		}
		return array(
			'headers'  => array(),
			'body'     => $release ? wp_json_encode( $release ) : '',
			'response' => array(
				'code'    => $release ? 200 : 204,
				'message' => '',
			),
			'cookies'  => array(),
			'filename' => null,
		);
	},
	10,
	3
);

$plugin   = Plugin::instance();
$settings = $plugin->settings();
$saved    = array(
	'key'    => (string) $settings->get( 'license_key' ),
	'status' => get_option( License_Client::STATUS_OPTION, null ),
);
$basename = plugin_basename( YALLAPP_FILE );
$status   = static function ( $state ) {
	update_option(
		License_Client::STATUS_OPTION,
		array(
			'status'       => $state,
			'plan'         => 'growth',
			'features'     => array( 'push' ),
			'expires_at'   => 'active' === $state ? gmdate( 'c', time() + 30 * DAY_IN_SECONDS ) : gmdate( 'c', time() - DAY_IN_SECONDS ),
			'checked_at'   => gmdate( 'c' ),
			'contacted_at' => time(),
		),
		false
	);
	delete_transient( 'yallapp_release' );
};
$updates  = static function () use ( $basename ) {
	$transient          = new stdClass();
	$transient->checked = array( $basename => YALLAPP_VERSION );
	$transient          = apply_filters( 'pre_set_site_transient_update_plugins', $transient, 'update_plugins' );
	return $transient->response[ $basename ] ?? null;
};

$check( 'update: the plugin offers updates from Yallapp', false !== has_filter( 'pre_set_site_transient_update_plugins', array( $plugin->license(), 'inject_update' ) ) );

$settings->update( array( 'license_key' => 'YALL-TEST-0000-0766' ) );
$status( 'active' );
$asked = array();
$offer = $updates();
$check(
	'update: an active plan gets the newer release in Dashboard › Updates',
	is_object( $offer ) && '9.9.9' === $offer->new_version && $release['download_url'] === $offer->package && 'yallapp' === $offer->slug && $basename === $offer->plugin,
	$offer
);
$query = array();
parse_str( (string) wp_parse_url( $asked[0] ?? '', PHP_URL_QUERY ), $query );
$check(
	'update: Yallapp is asked with the key, the site and the version',
	1 === count( $asked ) && 'YALL-TEST-0000-0766' === ( $query['license_key'] ?? '' ) && home_url( '/' ) === ( $query['site_url'] ?? '' ) && YALLAPP_VERSION === ( $query['version'] ?? '' ),
	$asked
);
$info = apply_filters( 'plugins_api', false, 'plugin_information', (object) array( 'slug' => 'yallapp' ) );
$check(
	'update: "View version details" shows the release and its changes',
	is_object( $info ) && '9.9.9' === $info->version && $release['download_url'] === $info->download_link && false !== strpos( (string) ( $info->sections['changelog'] ?? '' ), '<li>Better things</li>' ),
	$info
);
$other = apply_filters( 'plugins_api', false, 'plugin_information', (object) array( 'slug' => 'akismet' ) );
$check( 'update: other plugins\' details are left alone', false === $other, $other );
$check( 'update: asked once in 12 hours', 1 === count( $asked ), $asked );

// A license check clears the cache: the next update check asks again.
$status( 'active' );
$asked   = array();
$release = array_merge( $release, array( 'version' => YALLAPP_VERSION ) );
$offer   = $updates();
$check( 'update: the same version is no update', null === $offer && 1 === count( $asked ), array( $offer, $asked ) );

$status( 'active' );
$release = array();
$offer   = $updates();
$check( 'update: Yallapp\'s 204 is no update', null === $offer, $offer );

$release = array(
	'version'      => '9.9.9',
	'download_url' => 'https://yallapp.com.tr/api/v1/plugin/download?token=test',
);
$status( 'expired' );
$asked = array();
$offer = $updates();
$info  = apply_filters( 'plugins_api', false, 'plugin_information', (object) array( 'slug' => 'yallapp' ) );
$check( 'update: an ended plan gets no update and doesn\'t ask', null === $offer && false === $info && array() === $asked, array( $offer, $asked ) );

$settings->update( array( 'license_key' => '' ) );
$status( 'active' );
$asked = array();
$offer = $updates();
$check( 'update: no key, no update', null === $offer && array() === $asked, array( $offer, $asked ) );

$settings->update( array( 'license_key' => $saved['key'] ) );
if ( null === $saved['status'] ) {
	delete_option( License_Client::STATUS_OPTION );
} else {
	update_option( License_Client::STATUS_OPTION, $saved['status'], false );
}
delete_transient( 'yallapp_release' );
echo wp_json_encode( array( 'checks' => $checks ) );
