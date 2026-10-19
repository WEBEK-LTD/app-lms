<?php
/**
 * When a student finished a course, and their certificate.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * 45 `Progress.completed_at` and `CourseDetail.certificate_url` for every LMS: the LMS's own
 * date when its adapter gives one, else the moment the app completed the course's last item
 * (kept in user meta), else the certificate's date. Unknown stays null.
 */
class Course_Completion {

	const META = 'yallapp_course_completed_';

	/**
	 * The completion date to show, in order of trust. Pure.
	 *
	 * @param bool        $completed   Whether the course is complete.
	 * @param string|null $lms         The LMS's own date (ISO 8601).
	 * @param string|null $recorded    When the app completed the last item (ISO 8601).
	 * @param string|null $certificate The certificate's date (ISO 8601).
	 * @return string|null
	 */
	public static function pick( $completed, $lms, $recorded, $certificate ) {
		if ( ! $completed ) {
			return null;
		}
		foreach ( array( $lms, $recorded, $certificate ) as $date ) {
			if ( is_string( $date ) && '' !== $date && false !== strtotime( $date ) ) {
				return gmdate( 'Y-m-d\TH:i:s\Z', (int) strtotime( $date ) );
			}
		}
		return null;
	}

	/**
	 * Remembers when the app completed a course's last item (the first time only).
	 *
	 * @param array $progress Progress shape after completing a lesson.
	 * @param int   $user_id  Student.
	 * @return void
	 */
	public static function record( array $progress, $user_id ) {
		if ( empty( $progress['course_completed'] ) || empty( $progress['course_id'] ) || ! $user_id ) {
			return;
		}
		$key = self::META . (int) $progress['course_id'];
		if ( '' === (string) get_user_meta( (int) $user_id, $key, true ) ) {
			update_user_meta( (int) $user_id, $key, gmdate( 'Y-m-d\TH:i:s\Z' ) );
		}
	}

	/**
	 * A Progress shape with `completed_at`.
	 *
	 * @param array      $progress     Progress shape from the adapter.
	 * @param int        $user_id      Student.
	 * @param array|null $certificate  The course's Certificate shape, when there is one.
	 * @return array
	 */
	public static function fill( array $progress, $user_id, $certificate = null ) {
		$completed                = ! empty( $progress['course_completed'] );
		$recorded                 = $completed && $user_id ? (string) get_user_meta( (int) $user_id, self::META . (int) ( $progress['course_id'] ?? 0 ), true ) : '';
		$progress['completed_at'] = self::pick(
			$completed,
			isset( $progress['completed_at'] ) ? (string) $progress['completed_at'] : null,
			$recorded,
			is_array( $certificate ) && ! empty( $certificate['issued_at'] ) ? (string) $certificate['issued_at'] : null
		);
		return $progress;
	}

	/**
	 * The student's certificate for a course, from the LMS's certificates.
	 *
	 * @param Lms_Adapter $lms       Adapter.
	 * @param int         $course_id Course.
	 * @param int         $user_id   Student.
	 * @return array|null Certificate shape.
	 */
	public static function certificate( Lms_Adapter $lms, $course_id, $user_id ) {
		if ( ! $user_id ) {
			return null;
		}
		foreach ( (array) $lms->certificates( (int) $user_id ) as $certificate ) {
			if ( (int) ( $certificate['course_id'] ?? 0 ) === (int) $course_id && ! empty( $certificate['url'] ) ) {
				return $certificate;
			}
		}
		return null;
	}
}
