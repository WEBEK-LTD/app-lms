<?php
/**
 * Courses with a password on the website.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * 62 A course set to "Password protected" in WordPress (Tutor LMS, LearnPress and the other
 * LMSs keep WordPress's own setting) still shows in the catalog, as on the website. The app
 * never asks for the password: for a student who isn't enrolled in the course (and may not
 * edit it), the course comes without its description, lists and intro video, with no way to
 * enroll or buy, no topics, and its lessons (free previews too) are "not found"; the course
 * page offers "Open on the website" for the password step. Once enrolled there, it opens as
 * usual. Every route decides through here.
 */
class Course_Password {

	/**
	 * Whether the website asks for a password to open a course.
	 *
	 * @param object|null $post Course (WP_Post), or null.
	 * @return bool
	 */
	public static function protected_post( $post ) {
		return is_object( $post ) && '' !== (string) ( $post->post_password ?? '' );
	}

	/**
	 * Whether a password-protected course stays closed to a user in the app. Pure but for the
	 * two callbacks.
	 *
	 * @param object|null   $post     Course (WP_Post): its ID and post_password.
	 * @param int           $user_id  User, or 0.
	 * @param callable      $enrolled Called with (course ID, user ID): whether the user is enrolled.
	 * @param callable|null $can_edit Called with (user ID, course ID): whether the user may edit the
	 *                                course. Defaults to the `edit_post` capability.
	 * @return bool
	 */
	public static function locked( $post, $user_id, callable $enrolled, $can_edit = null ) {
		if ( ! self::protected_post( $post ) ) {
			return false;
		}
		$user_id = (int) $user_id;
		if ( $user_id <= 0 ) {
			return true;
		}
		$course_id = (int) $post->ID;
		$can_edit  = is_callable( $can_edit ) ? $can_edit : static function ( $user, $id ) {
			return user_can( $user, 'edit_post', $id );
		};
		return ! ( (bool) call_user_func( $can_edit, $user_id, $course_id ) || (bool) call_user_func( $enrolled, $course_id, $user_id ) );
	}

	/**
	 * The course as a student who can't open it sees it: no description, lists or intro
	 * video, and nothing to buy or enroll in. Pure.
	 *
	 * @param array $course CourseDetail.
	 * @return array
	 */
	public static function closed( array $course ) {
		$course['description_html'] = '';
		$course['intro_video']      = null;
		if ( isset( $course['about'] ) && is_array( $course['about'] ) ) {
			$course['about'] = array_map(
				static function () {
					return array();
				},
				$course['about']
			);
		}
		$course['purchase'] = array( 'action' => 'none' );
		return $course;
	}
}
