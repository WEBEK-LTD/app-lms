<?php
/**
 * Starting a finished course again.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use Yallapp\Rest\Learning_Controller;

/**
 * 73 `CourseDetail.can_restart` and `POST /courses/{id}/restart`: a student who finished a
 * course can take it again from the first lesson, when the LMS can clear their progress
 * (Lms_Adapter::can_reset_progress: Tutor LMS, LearnDash, LifterLMS, Sensei LMS, and
 * LearnPress while the course allows retakes; MasterStudy and Masteriyo can't yet) and the
 * site owner didn't turn it off for the course ("In the app" box on the course, on by
 * default). Besides the LMS's own progress, what the plugin keeps for the app goes too:
 * where each video stopped, how much of it was watched, and when the app completed the course.
 */
class Course_Restart {

	/** Set to "1" on a course whose students can't start it again in the app. */
	const META = '_yallapp_no_restart';

	/**
	 * Whether the site owner lets students start this course again (on unless turned off).
	 *
	 * @param int $course_id Course.
	 * @return bool
	 */
	public static function allowed_by_owner( $course_id ) {
		return '1' !== (string) get_post_meta( (int) $course_id, self::META, true );
	}

	/**
	 * `CourseDetail.can_restart`.
	 *
	 * @param Lms_Adapter $lms       Adapter.
	 * @param int         $course_id Course.
	 * @param int         $user_id   Student, or 0.
	 * @return bool
	 */
	public static function can_restart( Lms_Adapter $lms, $course_id, $user_id ) {
		return self::allowed_by_owner( $course_id ) && $lms->can_reset_progress( (int) $course_id, (int) $user_id );
	}

	/**
	 * The IDs of a curriculum's items (lessons, quizzes and the rest). Pure.
	 *
	 * @param array $topics Topic shapes.
	 * @return int[]
	 */
	public static function item_ids( array $topics ) {
		$ids = array();
		foreach ( $topics as $topic ) {
			foreach ( (array) ( $topic['items'] ?? array() ) as $item ) {
				if ( isset( $item['id'] ) ) {
					$ids[] = (int) $item['id'];
				}
			}
		}
		return array_values( array_unique( $ids ) );
	}

	/**
	 * The user meta keys the plugin keeps for a student's progress in a course. Pure.
	 *
	 * @param int   $course_id Course.
	 * @param int[] $item_ids  The course's items.
	 * @return string[]
	 */
	public static function meta_keys( $course_id, array $item_ids ) {
		$keys = array( Course_Completion::META . (int) $course_id );
		foreach ( $item_ids as $id ) {
			$keys[] = Learning_Controller::POSITION_META . (int) $id;
			$keys[] = Learning_Controller::WATCHED_META . (int) $id;
		}
		return $keys;
	}

	/**
	 * Deletes what the plugin keeps of a student's progress in a course.
	 *
	 * @param int   $user_id   Student.
	 * @param int   $course_id Course.
	 * @param int[] $item_ids  The course's items.
	 * @return void
	 */
	public static function forget( $user_id, $course_id, array $item_ids ) {
		foreach ( self::meta_keys( $course_id, $item_ids ) as $key ) {
			delete_user_meta( (int) $user_id, $key );
		}
	}
}
