<?php
/**
 * Which courses the app shows and opens.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * 50 A course set to Private in WordPress, which is how Tutor LMS ("Visibility: Private"),
 * LearnPress and the other LMSs hide a course from the catalog, never shows in the catalog
 * or to visitors. It shows in My courses and opens, with its lessons under the usual access
 * rules, for the students enrolled in it however they were enrolled (bought, free or added
 * by an administrator), and for whoever may read it on the website: its author, editors and
 * administrators. Anyone else gets the course's "not found". Every adapter decides through
 * here, so they all decide the same way.
 */
class Course_Visibility {

	/**
	 * Statuses of a course the LMS keeps: published, or private.
	 */
	const STATUSES = array( 'publish', 'private' );

	/**
	 * Whether a post is a published or private course of a type.
	 *
	 * @param object|null     $post      Post (WP_Post), or null.
	 * @param string|string[] $post_type Course post type(s).
	 * @return bool
	 */
	public static function live( $post, $post_type ) {
		return is_object( $post ) && in_array( $post->post_type ?? '', (array) $post_type, true ) && in_array( $post->post_status ?? '', self::STATUSES, true );
	}

	/**
	 * Whether a user may see and open a course. Pure but for the two callbacks.
	 *
	 * @param object        $post     Course (WP_Post): its ID and post_status.
	 * @param int           $user_id  User, or 0.
	 * @param callable      $enrolled Called with (course ID, user ID): whether the user is enrolled.
	 * @param callable|null $can_read Called with (user ID, course ID): whether WordPress lets the
	 *                                user read the private post. Defaults to the `read_post` capability.
	 * @return bool
	 */
	public static function viewable( $post, $user_id, callable $enrolled, $can_read = null ) {
		$status = (string) ( $post->post_status ?? '' );
		if ( 'publish' === $status ) {
			return true;
		}
		$user_id = (int) $user_id;
		if ( 'private' !== $status || $user_id <= 0 ) {
			return false;
		}
		$course_id = (int) $post->ID;
		$can_read  = is_callable( $can_read ) ? $can_read : static function ( $user, $id ) {
			return user_can( $user, 'read_post', $id );
		};
		return (bool) call_user_func( $can_read, $user_id, $course_id ) || (bool) call_user_func( $enrolled, $course_id, $user_id );
	}
}
