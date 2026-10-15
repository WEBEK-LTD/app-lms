<?php
/**
 * CourseDetail.about: the lists beside a course's description, as plain lines.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Lms\Course_About;

class CourseAboutTest extends TestCase {

	public function test_tutor_text_has_one_item_per_line() {
		$this->assertSame(
			array( 'Plan a treatment', 'Read an X-ray', 'خطة العلاج' ),
			Course_About::lines( "Plan a treatment\r\n\n- Read an X-ray\n  • خطة العلاج  " )
		);
	}

	public function test_learnpress_lists_and_lists_of_lists() {
		$this->assertSame( array( 'A laptop', 'Patience' ), Course_About::lines( array( 'A laptop', '', array( 'Patience' ), array( array( 'nested' ) ), null ) ) );
	}

	public function test_markup_is_removed_and_nothing_stored_gives_empty_lists() {
		$this->assertSame( array( 'Bold & clear' ), Course_About::lines( '<strong>Bold</strong> &amp; clear' ) );
		$this->assertSame( array(), Course_About::lines( '' ) );
		$this->assertSame( array(), Course_About::lines( false ) );
		$this->assertSame(
			array(
				'learn'        => array( 'One' ),
				'requirements' => array(),
				'audience'     => array(),
				'includes'     => array(),
			),
			Course_About::shape( 'One' )
		);
	}

	public function test_long_lists_are_cut() {
		$this->assertCount( Course_About::MAX_LINES, Course_About::lines( implode( "\n", range( 1, 80 ) ) ) );
	}
}
