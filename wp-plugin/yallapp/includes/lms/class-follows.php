<?php
/**
 * The teachers a student follows.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * 123 A student follows a course's teacher from its page and hears of each new course of
 * theirs. Both sides are kept: on the student the teachers they follow, on the teacher the
 * students following them, so a new course reaches its followers without searching everyone.
 */
class Follows {

	const FOLLOWING = 'yallapp_following';
	const FOLLOWERS = 'yallapp_followers';
	/** At most this many teachers per student. */
	const LIMIT = 500;

	/**
	 * The teachers a student follows.
	 *
	 * @param int $user_id Student.
	 * @return int[]
	 */
	public static function following( $user_id ) {
		return self::ids( get_user_meta( (int) $user_id, self::FOLLOWING, true ) );
	}

	/**
	 * The students following a teacher.
	 *
	 * @param int $instructor_id Teacher.
	 * @return int[]
	 */
	public static function followers( $instructor_id ) {
		return self::ids( get_user_meta( (int) $instructor_id, self::FOLLOWERS, true ) );
	}

	/**
	 * Follows a teacher, or stops following them.
	 *
	 * @param int  $user_id       Student.
	 * @param int  $instructor_id Teacher.
	 * @param bool $follow        Follow (true) or stop (false).
	 * @return bool Whether the teacher is someone to follow.
	 */
	public static function set( $user_id, $instructor_id, $follow ) {
		$user_id       = (int) $user_id;
		$instructor_id = (int) $instructor_id;
		if ( $user_id <= 0 || $instructor_id <= 0 || $user_id === $instructor_id || ! get_userdata( $instructor_id ) ) {
			return false;
		}
		$following = array_values( array_diff( self::following( $user_id ), array( $instructor_id ) ) );
		$followers = array_values( array_diff( self::followers( $instructor_id ), array( $user_id ) ) );
		if ( $follow ) {
			$following[] = $instructor_id;
			$followers[] = $user_id;
		}
		update_user_meta( $user_id, self::FOLLOWING, array_slice( $following, -self::LIMIT ) );
		update_user_meta( $instructor_id, self::FOLLOWERS, $followers );
		return true;
	}

	/**
	 * Positive whole ids, once each.
	 *
	 * @param mixed $raw Stored.
	 * @return int[]
	 */
	private static function ids( $raw ) {
		return array_values( array_unique( array_filter( array_map( 'intval', is_array( $raw ) ? $raw : array() ), fn( $id ) => $id > 0 ) ) );
	}
}
