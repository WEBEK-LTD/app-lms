<?php
/**
 * 73 Starting a finished course again: what the plugin forgets besides the LMS's progress.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Lms\Course_Restart;

class CourseRestartTest extends TestCase {

	public function test_item_ids_of_every_topic_once() {
		$topics = array(
			array( 'items' => array( array( 'id' => 11 ), array( 'id' => 12 ) ) ),
			array( 'items' => array( array( 'id' => 13 ), array( 'id' => 11 ) ) ),
			array( 'items' => array() ),
			array(),
		);
		$this->assertSame( array( 11, 12, 13 ), Course_Restart::item_ids( $topics ) );
		$this->assertSame( array(), Course_Restart::item_ids( array() ) );
	}

	public function test_meta_keys_are_the_completion_date_and_each_items_position_and_share_watched() {
		$this->assertSame(
			array( 'yallapp_course_completed_7', 'yallapp_position_11', 'yallapp_watched_11', 'yallapp_position_12', 'yallapp_watched_12' ),
			Course_Restart::meta_keys( 7, array( 11, 12 ) )
		);
	}
}
