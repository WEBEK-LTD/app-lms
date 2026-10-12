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
 */
class Detector {

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
		$others = array(
			'learndash'   => array( 'LEARNDASH_VERSION', 'LearnDash' ),
			'learnpress'  => array( 'LEARNPRESS_VERSION', 'LearnPress' ),
			'lifterlms'   => array( 'LLMS_VERSION', 'LifterLMS' ),
			'masterstudy' => array( 'MS_LMS_VERSION', 'MasterStudy LMS' ),
			'sensei'      => array( 'SENSEI_LMS_VERSION', 'Sensei LMS' ),
			'masteriyo'   => array( 'MASTERIYO_VERSION', 'Masteriyo' ),
		);
		foreach ( $others as $id => $info ) {
			if ( defined( $info[0] ) ) {
				return array(
					'id'        => $id,
					'name'      => $info[1],
					'version'   => (string) constant( $info[0] ),
					'pro'       => false,
					'supported' => false,
				);
			}
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
