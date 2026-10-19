<?php
/**
 * 50 Private courses: hidden from everyone but their students and whoever may read them.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Lms\Course_Visibility;

class CourseVisibilityTest extends TestCase {

	private static function course( $status, $type = 'courses' ) {
		return (object) array(
			'ID'          => 7,
			'post_type'   => $type,
			'post_status' => $status,
		);
	}

	private static function enrolled( array $students ) {
		return static function ( $course_id, $user_id ) use ( $students ) {
			return 7 === $course_id && in_array( $user_id, $students, true );
		};
	}

	private static function readers( array $users ) {
		return static function ( $user_id, $course_id ) use ( $users ) {
			return 7 === $course_id && in_array( $user_id, $users, true );
		};
	}

	public function test_published_courses_open_for_everyone() {
		$this->assertTrue( Course_Visibility::viewable( self::course( 'publish' ), 0, self::enrolled( array() ), self::readers( array() ) ) );
		$this->assertTrue( Course_Visibility::viewable( self::course( 'publish' ), 5, self::enrolled( array() ), self::readers( array() ) ) );
	}

	public function test_private_courses_open_for_their_students_and_readers_only() {
		$private = self::course( 'private' );
		$this->assertTrue( Course_Visibility::viewable( $private, 5, self::enrolled( array( 5 ) ), self::readers( array() ) ) );
		$this->assertTrue( Course_Visibility::viewable( $private, 1, self::enrolled( array( 5 ) ), self::readers( array( 1 ) ) ) );
		$this->assertFalse( Course_Visibility::viewable( $private, 6, self::enrolled( array( 5 ) ), self::readers( array( 1 ) ) ) );
		$this->assertFalse( Course_Visibility::viewable( $private, 0, self::enrolled( array( 0 ) ), self::readers( array( 0 ) ) ) );
	}

	public function test_drafts_and_trashed_courses_never_open() {
		foreach ( array( 'draft', 'pending', 'future', 'trash', '' ) as $status ) {
			$this->assertFalse( Course_Visibility::viewable( self::course( $status ), 5, self::enrolled( array( 5 ) ), self::readers( array( 5 ) ) ), $status );
		}
	}

	public function test_live_is_a_published_or_private_course_of_the_type() {
		$this->assertTrue( Course_Visibility::live( self::course( 'publish' ), 'courses' ) );
		$this->assertTrue( Course_Visibility::live( self::course( 'private' ), array( 'sfwd-courses', 'courses' ) ) );
		$this->assertFalse( Course_Visibility::live( self::course( 'draft' ), 'courses' ) );
		$this->assertFalse( Course_Visibility::live( self::course( 'publish', 'lesson' ), 'courses' ) );
		$this->assertFalse( Course_Visibility::live( null, 'courses' ) );
	}
}
