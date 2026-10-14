<?php
/**
 * Detects the plugins the site runs.
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

/**
 * Reports which LMS, OTP and checkout plugins are installed, and their versions.
 *
 * The oldest LMS version each adapter supports, and the version the end-to-end checks
 * (tests/integration) run against:
 *
 * | LMS         | Minimum | Tested |
 * |-------------|---------|--------|
 * | Tutor LMS   | 2.0.6   | 4.1.1  |
 * | LearnPress  | 4.2.7.6 | 4.4.8  |
 * | LifterLMS   | 7.0.0   | 10.3.2 |
 * | MasterStudy | 3.0.0   | 3.4.9  |
 * | Sensei LMS  | 4.0.0   | 4.26.4 |
 * | Masteriyo   | 1.6.0   | 1.13.4 |
 * | LearnDash   | 4.0.0   | 5.2.0  |
 *
 * LearnDash isn't on wordpress.org, so its checks run only on a local copy
 * (tests/dev-site/setup.sh with LMS=learndash and LEARNDASH_DIR), not in CI.
 */
class Detector {

	/**
	 * LMS plugins other than Tutor: version constant, a function or class its adapter
	 * relies on, name, and the oldest version the adapter supports.
	 */
	const LMS = array(
		'learndash'   => array( 'LEARNDASH_VERSION', 'learndash_get_course_id', 'LearnDash', '4.0.0' ),
		'learnpress'  => array( 'LEARNPRESS_VERSION', 'learn_press_get_user', 'LearnPress', '4.2.7.6' ),
		'lifterlms'   => array( 'LLMS_VERSION', 'llms_get_student', 'LifterLMS', '7.0.0' ),
		'masterstudy' => array( 'MS_LMS_VERSION', 'STM_LMS_Course', 'MasterStudy LMS', '3.0.0' ),
		'sensei'      => array( 'SENSEI_LMS_VERSION', 'Sensei', 'Sensei LMS', '4.0.0' ),
		'masteriyo'   => array( 'MASTERIYO_VERSION', 'masteriyo', 'Masteriyo', '1.6.0' ),
	);

	/**
	 * The active LMS, or null.
	 *
	 * @return array{id: string, name: string, version: string, pro: bool, supported: bool}|null
	 */
	public function lms() {
		if ( defined( 'TUTOR_VERSION' ) && function_exists( 'tutor_utils' ) ) {
			return array(
				'id'        => 'tutor',
				'name'      => 'Tutor LMS',
				'version'   => (string) TUTOR_VERSION,
				'pro'       => defined( 'TUTOR_PRO_VERSION' ),
				'supported' => version_compare( TUTOR_VERSION, '2.0.6', '>=' ),
			);
		}
		foreach ( self::LMS as $id => $info ) {
			if ( ! defined( $info[0] ) ) {
				continue;
			}
			$version = (string) constant( $info[0] );
			$loaded  = function_exists( $info[1] ) || class_exists( $info[1] );
			return array(
				'id'        => $id,
				'name'      => $info[2],
				'version'   => $version,
				'pro'       => $this->lms_pro( $id ),
				'supported' => $loaded && version_compare( $version, $info[3], '>=' ),
			);
		}
		return null;
	}

	/**
	 * Whether an LMS's paid edition is active.
	 *
	 * @param string $id LMS ID.
	 * @return bool
	 */
	private function lms_pro( $id ) {
		$constants = array(
			'masterstudy' => 'STM_LMS_PRO_FILE',
			'sensei'      => 'SENSEI_PRO_VERSION',
			'masteriyo'   => 'MASTERIYO_PRO_VERSION',
		);
		return isset( $constants[ $id ] ) && defined( $constants[ $id ] );
	}

	/**
	 * Booking plugins: a class that shows it's loaded and its adapter relies on, the
	 * constant or option holding its version, its name, and the oldest version the
	 * adapter supports.
	 */
	const BOOKINGS = array(
		'amelia'       => array( 'AmeliaBooking\\Application\\Controller\\Booking\\Appointment\\AddBookingController', 'AMELIA_VERSION', 'Amelia', '2.0.0' ),
		'latepoint'    => array( 'OsBookingModel', 'latepoint_plugin_version', 'LatePoint', '5.0.0' ),
		'bookingpress' => array( 'BookingPress_Core', 'bookingpress_version', 'BookingPress', '1.1.0' ),
	);

	/**
	 * The active booking plugin, or null.
	 *
	 * @return array{id: string, name: string, version: string, supported: bool}|null
	 */
	public function booking() {
		foreach ( self::BOOKINGS as $id => $info ) {
			if ( ! class_exists( $info[0] ) ) {
				continue;
			}
			$version = defined( $info[1] ) ? (string) constant( $info[1] ) : (string) get_option( $info[1], '' );
			return array(
				'id'        => $id,
				'name'      => $info[2],
				'version'   => $version,
				'supported' => '' !== $version && version_compare( $version, $info[3], '>=' ),
			);
		}
		return null;
	}

	/**
	 * Digits status.
	 *
	 * @return array{active: bool, version: string, api: bool}
	 */
	public function digits() {
		$active  = $this->plugin_active( 'digits' );
		$version = '';
		foreach ( array( 'DIGITS_VERSION', 'DIGITS_PLUGIN_VERSION' ) as $constant ) {
			if ( defined( $constant ) ) {
				$version = (string) constant( $constant );
				break;
			}
		}
		return array(
			'active'  => $active,
			'version' => $version,
			'api'     => $active && $this->has_route( '/digits/v1/send_otp' ),
		);
	}

	/**
	 * WooCommerce status.
	 *
	 * @return array{active: bool, version: string}
	 */
	public function woocommerce() {
		return array(
			'active'  => class_exists( 'WooCommerce' ),
			'version' => defined( 'WC_VERSION' ) ? (string) WC_VERSION : '',
		);
	}

	/**
	 * Whether a plugin whose folder starts with the slug is active.
	 *
	 * @param string $slug Plugin folder.
	 * @return bool
	 */
	private function plugin_active( $slug ) {
		foreach ( (array) get_option( 'active_plugins', array() ) as $plugin ) {
			if ( 0 === strpos( (string) $plugin, $slug . '/' ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether a REST route is registered.
	 *
	 * @param string $route Route path.
	 * @return bool
	 */
	private function has_route( $route ) {
		if ( ! did_action( 'rest_api_init' ) ) {
			return false;
		}
		return array_key_exists( $route, rest_get_server()->get_routes() );
	}
}
