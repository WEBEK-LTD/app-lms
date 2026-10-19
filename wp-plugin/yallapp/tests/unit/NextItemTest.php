<?php
/**
 * 39 MyCourse.next_item: where "Continue" takes a student.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Lms\Next_Item;

class NextItemTest extends TestCase {

	private static function item( $id, $type, $completed = false, $locked = false ) {
		return array(
			'id'        => $id,
			'type'      => $type,
			'completed' => $completed,
			'locked'    => $locked,
		);
	}

	public function test_first_unfinished_lesson_or_quiz() {
		$topics = array(
			array( 'items' => array( self::item( 1, 'lesson', true ), self::item( 2, 'quiz', true ) ) ),
			array( 'items' => array( self::item( 3, 'quiz' ), self::item( 4, 'lesson' ) ) ),
		);
		$this->assertSame( 3, Next_Item::pick( $topics )['id'] );
	}

	public function test_assignments_and_live_classes_are_skipped() {
		// They open on the website and never complete from the app: "Continue" would stop there.
		$topics = array(
			array( 'items' => array( self::item( 1, 'lesson', true ), self::item( 2, 'assignment' ), self::item( 3, 'live' ), self::item( 4, 'lesson' ) ) ),
		);
		$this->assertSame( 4, Next_Item::pick( $topics )['id'] );
	}

	public function test_locked_items_are_skipped_and_nothing_left_is_null() {
		$this->assertSame( 2, Next_Item::pick( array( array( 'items' => array( self::item( 1, 'lesson', false, true ), self::item( 2, 'lesson' ) ) ) ) )['id'] );
		$this->assertNull( Next_Item::pick( array( array( 'items' => array( self::item( 1, 'lesson', true ), self::item( 2, 'assignment' ) ) ) ) ) );
		$this->assertNull( Next_Item::pick( array() ) );
	}
}
