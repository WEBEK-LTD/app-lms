<?php
/**
 * The app layout published in the Yallapp dashboard.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use Yallapp\License\License_Client;
use Yallapp\Settings;

/**
 * Fetches the layout (POST /apps/layout in docs/api/platform.yaml) when the license is
 * activated, every 15 minutes, when the site admin asks and (31) when the platform asks the
 * site to check its license now, and keeps the last copy.
 *
 * 200 replaces the copy, 304 keeps it, 204 clears it (the app gets the default pages).
 * Failures keep the last copy. Only the site details in SiteInfo are sent.
 */
class Layout_Client {

	const OPTION      = 'yallapp_layout';
	const HOOK        = 'yallapp_layout_refresh';
	const SCHEDULE    = 'yallapp_15_minutes';
	const INTERVAL    = 900;
	const MAX_PAGES   = 50;
	const MAX_BLOCKS  = 100;
	const LAYOUT_KEYS = array( 'version', 'appearance', 'languages', 'tabs', 'pages' );

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * License client.
	 *
	 * @var License_Client
	 */
	private $license;

	/**
	 * Constructor.
	 *
	 * @param Settings       $settings Settings.
	 * @param License_Client $license  License client.
	 */
	public function __construct( Settings $settings, License_Client $license ) {
		$this->settings = $settings;
		$this->license  = $license;
	}

	/**
	 * Hooks into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_filter( 'cron_schedules', array( __CLASS__, 'cron_schedules' ) ); // phpcs:ignore WordPress.WP.CronInterval.ChangeDetected -- 15 minutes, as docs/api/platform.yaml says.
		add_action( self::HOOK, array( $this, 'refresh' ) );
		add_action( 'init', array( $this, 'schedule' ) );
		add_action( 'yallapp_license_activated', array( $this, 'refresh' ) );
		// 31 The platform asked the site to check now (the owner published or changed a setting).
		add_action( 'yallapp_license_refreshed', array( $this, 'refresh' ) );
		add_action( 'yallapp_license_deactivated', array( $this, 'forget' ) );
	}

	/**
	 * Adds the 15-minute cron interval.
	 *
	 * @param array $schedules Schedules.
	 * @return array
	 */
	public static function cron_schedules( $schedules ) {
		$schedules[ self::SCHEDULE ] = array(
			'interval' => self::INTERVAL,
			'display'  => __( 'Every 15 minutes', 'yallapp' ),
		);
		return $schedules;
	}

	/**
	 * Schedules the 15-minute refresh.
	 *
	 * @return void
	 */
	public function schedule() {
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time() + self::INTERVAL, self::SCHEDULE, self::HOOK );
		}
	}

	/**
	 * What is stored: the layout (null when nothing is published), when the platform last
	 * answered, when it was last asked, and the last error.
	 *
	 * @return array{layout: array|null, fetched_at: int, attempted_at: int, error: string|null}
	 */
	public function state() {
		$stored = get_option( self::OPTION, array() );
		$state  = array_merge(
			array(
				'layout'       => null,
				'fetched_at'   => 0,
				'attempted_at' => 0,
				'error'        => null,
			),
			is_array( $stored ) ? $stored : array()
		);
		if ( ! is_array( $state['layout'] ) ) {
			$state['layout'] = null;
		}
		return $state;
	}

	/**
	 * The stored layout, or null when the app gets the default pages.
	 *
	 * @return array|null Layout shape from docs/api/platform.yaml.
	 */
	public function layout() {
		return $this->state()['layout'];
	}

	/**
	 * Asks the platform for the published layout. Runs in cron, on license activation and
	 * from the admin page.
	 *
	 * @return string|WP_Error updated, unchanged or cleared; an error keeps the stored copy.
	 */
	public function refresh() {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' === $key ) {
			return new WP_Error( 'license_missing', __( 'Activate your license to use the pages you publish in your Yallapp dashboard.', 'yallapp' ) );
		}
		if ( ! $this->license->is_active() ) {
			return $this->failed( new WP_Error( 'license_inactive', __( 'Your license is not active, so the app layout was not refreshed.', 'yallapp' ) ) );
		}
		$state   = $this->state();
		$headers = array(
			'Accept'       => 'application/json',
			'Content-Type' => 'application/json',
		);
		if ( $state['layout'] ) {
			$headers['If-None-Match'] = (string) $state['layout']['version'];
		}
		$response = wp_remote_post(
			License_Client::base_url() . '/apps/layout',
			array(
				'timeout' => 15,
				'headers' => $headers,
				'body'    => wp_json_encode( $this->license->site_info( $key ) ),
			)
		);
		if ( is_wp_error( $response ) ) {
			return $this->failed( new WP_Error( 'platform_unreachable', __( 'Could not reach yallapp.com.tr. Try again in a few minutes.', 'yallapp' ) ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( 304 === $code && $state['layout'] ) {
			return $this->save( $state['layout'], 'unchanged' );
		}
		if ( 204 === $code ) {
			return $this->save( null, 'cleared' );
		}
		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( 200 === $code ) {
			$layout = self::validate( $data );
			if ( ! $layout ) {
				return $this->failed( new WP_Error( 'platform_error', __( 'The app layout from yallapp.com.tr could not be read.', 'yallapp' ) ) );
			}
			return $this->save( $layout, 'updated' );
		}
		$message = is_array( $data ) && ! empty( $data['message'] ) ? sanitize_text_field( (string) $data['message'] ) : __( 'The license server returned an error.', 'yallapp' );
		return $this->failed( new WP_Error( is_array( $data ) && ! empty( $data['code'] ) ? sanitize_key( (string) $data['code'] ) : 'platform_error', $message, array( 'status' => $code ) ) );
	}

	/**
	 * Drops the stored layout, when the license is released from this site.
	 *
	 * @return void
	 */
	public function forget() {
		delete_option( self::OPTION );
	}

	/**
	 * Checks a Layout from the platform and keeps only its known parts. Each part is
	 * cleaned again when it is served.
	 *
	 * @param mixed $data Decoded body.
	 * @return array|null
	 */
	public static function validate( $data ) {
		if ( ! is_array( $data ) || ! isset( $data['version'] ) || ! is_scalar( $data['version'] ) || '' === (string) $data['version'] ) {
			return null;
		}
		if ( ! isset( $data['tabs'], $data['pages'] ) || ! is_array( $data['tabs'] ) || ! is_array( $data['pages'] ) ) {
			return null;
		}
		$layout            = array_intersect_key( $data, array_flip( self::LAYOUT_KEYS ) );
		$layout['version'] = substr( sanitize_text_field( (string) $data['version'] ), 0, 100 );
		$layout['pages']   = array_slice( array_values( array_filter( $data['pages'], 'is_array' ) ), 0, self::MAX_PAGES );
		foreach ( $layout['pages'] as $index => $page ) {
			$blocks                              = isset( $page['blocks'] ) && is_array( $page['blocks'] ) ? $page['blocks'] : array();
			$layout['pages'][ $index ]['blocks'] = array_slice( array_values( array_filter( $blocks, 'is_array' ) ), 0, self::MAX_BLOCKS );
		}
		$layout['tabs']       = array_values( array_filter( $data['tabs'], 'is_array' ) );
		$layout['appearance'] = isset( $data['appearance'] ) && is_array( $data['appearance'] ) ? $data['appearance'] : null;
		$layout['languages']  = isset( $data['languages'] ) && is_array( $data['languages'] ) ? $data['languages'] : null;
		return $layout;
	}

	/**
	 * Stores a successful answer.
	 *
	 * @param array|null $layout Layout, or null for the default pages.
	 * @param string     $result What happened.
	 * @return string
	 */
	private function save( $layout, $result ) {
		$now = time();
		update_option(
			self::OPTION,
			array(
				'layout'       => $layout,
				'fetched_at'   => $now,
				'attempted_at' => $now,
				'error'        => null,
			),
			false
		);
		return $result;
	}

	/**
	 * Notes a failed refresh and keeps the stored layout.
	 *
	 * @param WP_Error $error Error.
	 * @return WP_Error
	 */
	private function failed( WP_Error $error ) {
		$state                 = $this->state();
		$state['attempted_at'] = time();
		$state['error']        = $error->get_error_message();
		update_option( self::OPTION, $state, false );
		return $error;
	}
}
