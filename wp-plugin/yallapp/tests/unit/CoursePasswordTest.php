<?php
/**
 * 62 Courses with a password on the website: shown, never asked for in the app.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Lms\Course_Password;

class CoursePasswordTest extends TestCase {

	private static function course( $password ) {
		return (object) array(
			'ID'            => 7,
			'post_status'   => 'publish',
			'post_password' => $password,
		);
	}

	private static function enrolled( array $students ) {
		return static function ( $course_id, $user_id ) use ( $students ) {
			return 7 === $course_id && in_array( $user_id, $students, true );
		};
	}

	private static function editors( array $users ) {
		return static function ( $user_id, $course_id ) use ( $users ) {
			return 7 === $course_id && in_array( $user_id, $users, true );
		};
	}

	public function test_a_course_without_a_password_is_never_locked() {
		$this->assertFalse( Course_Password::protected_post( self::course( '' ) ) );
		$this->assertFalse( Course_Password::protected_post( null ) );
		$this->assertFalse( Course_Password::locked( self::course( '' ), 0, self::enrolled( array() ), self::editors( array() ) ) );
	}

	public function test_a_password_course_opens_for_its_students_and_editors_only() {
		$course = self::course( 'open sesame' );
		$this->assertTrue( Course_Password::protected_post( $course ) );
		$this->assertTrue( Course_Password::locked( $course, 0, self::enrolled( array( 0 ) ), self::editors( array( 0 ) ) ) );
		$this->assertTrue( Course_Password::locked( $course, 6, self::enrolled( array( 5 ) ), self::editors( array( 1 ) ) ) );
		$this->assertFalse( Course_Password::locked( $course, 5, self::enrolled( array( 5 ) ), self::editors( array() ) ) );
		$this->assertFalse( Course_Password::locked( $course, 1, self::enrolled( array() ), self::editors( array( 1 ) ) ) );
	}

	public function test_a_closed_course_has_nothing_to_read_or_buy() {
		$closed = Course_Password::closed(
			array(
				'id'               => 7,
				'title'            => 'Design',
				'description_html' => '<p>Secret</p>',
				'intro_video'      => array( 'source' => 'youtube' ),
				'about'            => array(
					'learn'        => array( 'A' ),
					'requirements' => array(),
				),
				'purchase'         => array( 'action' => 'checkout' ),
			)
		);
		$this->assertSame( 'Design', $closed['title'] );
		$this->assertSame( '', $closed['description_html'] );
		$this->assertNull( $closed['intro_video'] );
		$this->assertSame(
			array(
				'learn'        => array(),
				'requirements' => array(),
			),
			$closed['about']
		);
		$this->assertSame( array( 'action' => 'none' ), $closed['purchase'] );
	}
}
