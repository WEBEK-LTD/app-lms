<?php
/**
 * 124.12 A lesson's content reaches the app even when a plugin of the site empties it outside its pages.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Content\Lesson_Renderer;

class LessonContent124Test extends TestCase {

	const FRAME = '<iframe style="width: 100%; height: 640px; border: 0;" src="https://call.example.com/join/abc"></iframe>';

	public static function format( $text ) {
		return '<p>' . $text . '</p>';
	}

	public function test_what_the_website_shows_comes_first() {
		$this->assertSame( '<p>Shown</p>', Lesson_Renderer::or_saved( '<p>Shown</p>', 'Saved', array( self::class, 'format' ) ) );
	}

	public function test_an_emptied_content_is_the_saved_one_formatted() {
		$this->assertSame( '<p>' . self::FRAME . '</p>', Lesson_Renderer::or_saved( '', self::FRAME, array( self::class, 'format' ) ) );
		$this->assertSame( '<p>Read the guide.</p>', Lesson_Renderer::or_saved( " \n ", 'Read the guide.', array( self::class, 'format' ) ) );
	}

	public function test_a_lesson_with_nothing_saved_stays_empty() {
		$this->assertSame( '', Lesson_Renderer::or_saved( '', '  ', array( self::class, 'format' ) ) );
	}
}
