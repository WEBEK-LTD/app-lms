<?php
/**
 * Enrolment for a course bought through Google Play or the App Store.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use WP_Error;

/**
 * 100.4 What an LMS adapter does when Yallapp asks the site to give or take a course bought in
 * the app (`POST /billing/access`). Separate from Lms_Adapter so adapters other plugins add
 * through `yallapp_lms_adapter` keep working; without it, a course bought in the app can't be
 * given on that site.
 */
interface Store_Enrolment {

	/**
	 * Enrols a student in a course, paid or not, as the LMS does after a payment.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return true|WP_Error `not_found` (404) for a course that isn't there.
	 */
	public function grant_course( $course_id, $user_id );

	/**
	 * Takes a student out of a course (refunded or revoked in the store).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return true|WP_Error
	 */
	public function revoke_course( $course_id, $user_id );
}
