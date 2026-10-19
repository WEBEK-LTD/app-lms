<?php
/**
 * Where "Continue" takes a student.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * MyCourse.next_item: the first lesson or quiz the student hasn't finished and may open.
 */
class Next_Item {

	/**
	 * 39 Item types the app opens itself. Assignments and live classes open on the website,
	 * and the LMS never marks them complete from the app, so "Continue" would stop at the
	 * first one for good.
	 */
	const OPENED_IN_APP = array( 'lesson', 'quiz' );

	/**
	 * The next item from a curriculum (Topic shapes), or null when nothing is left. Pure.
	 *
	 * @param array[] $topics Topic shapes with their CurriculumItem shapes.
	 * @return array|null CurriculumItem shape.
	 */
	public static function pick( array $topics ) {
		foreach ( $topics as $topic ) {
			foreach ( (array) ( $topic['items'] ?? array() ) as $item ) {
				if ( empty( $item['completed'] ) && empty( $item['locked'] ) && in_array( $item['type'] ?? '', self::OPENED_IN_APP, true ) ) {
					return $item;
				}
			}
		}
		return null;
	}
}
