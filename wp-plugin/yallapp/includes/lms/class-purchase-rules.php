<?php
/**
 * What the course page's main button does.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * Decides the purchase action per platform. iOS never gets a checkout action.
 */
class Purchase_Rules {

	/**
	 * The `purchase.action` for a course.
	 *
	 * @param bool   $enrolled             Whether the student is enrolled.
	 * @param bool   $is_free              Whether the course is free.
	 * @param string $platform             android or ios.
	 * @param bool   $free_enrollment      "Free courses: enroll in the app" setting.
	 * @param bool   $android_checkout     "Enroll now on Android" setting.
	 * @param bool   $has_checkout         Whether the site sells the course.
	 * @return string continue|enroll_free|checkout|none
	 */
	public static function action( $enrolled, $is_free, $platform, $free_enrollment, $android_checkout, $has_checkout ) {
		if ( $enrolled ) {
			return 'continue';
		}
		if ( $is_free ) {
			return $free_enrollment ? 'enroll_free' : 'none';
		}
		if ( 'android' === $platform && $android_checkout && $has_checkout ) {
			return 'checkout';
		}
		return 'none';
	}

	/**
	 * Whether "Enroll now" is shown for paid courses on a platform.
	 *
	 * @param string $platform         android or ios.
	 * @param bool   $android_checkout "Enroll now on Android" setting.
	 * @return bool
	 */
	public static function enroll_button( $platform, $android_checkout ) {
		return 'android' === $platform && $android_checkout;
	}
}
