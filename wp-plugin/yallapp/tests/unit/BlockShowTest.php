<?php
/**
 * 99.3 When a block shows (dates, platforms, languages) and a page's background and
 * header picture.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Pages\Pages;

class BlockShowTest extends TestCase {

	const NOW = 1791800000; // 2026-10-12.

	private function shows( $show, $platform = 'android', $language = 'en', $now = self::NOW ) {
		return Block_Resolver::shows( $show, $platform, $language, $now );
	}

	public function test_no_rules_always_show() {
		$this->assertTrue( $this->shows( null ) );
		$this->assertTrue( $this->shows( 'always' ) );
		$this->assertTrue( $this->shows( array() ) );
		$this->assertTrue(
			$this->shows(
				array(
					'from'      => null,
					'until'     => null,
					'platforms' => null,
					'languages' => null,
				)
			)
		);
	}

	public function test_between_from_and_until_only() {
		$show = array(
			'from'  => '2026-10-01T00:00:00Z',
			'until' => '2026-10-31T23:59:59Z',
		);
		$this->assertTrue( $this->shows( $show ) );
		$this->assertFalse( $this->shows( $show, 'android', 'en', strtotime( '2026-09-30T23:59:59Z' ) ) );
		$this->assertTrue( $this->shows( $show, 'android', 'en', strtotime( '2026-10-01T00:00:00Z' ) ) );
		$this->assertTrue( $this->shows( $show, 'android', 'en', strtotime( '2026-10-31T23:59:59Z' ) ) );
		$this->assertFalse( $this->shows( $show, 'android', 'en', strtotime( '2026-11-01T00:00:00Z' ) ) );
		// One end only; an offset counts.
		$this->assertFalse( $this->shows( array( 'from' => '2026-10-12T12:00:00+03:00' ), 'android', 'en', strtotime( '2026-10-12T08:59:59Z' ) ) );
		$this->assertTrue( $this->shows( array( 'from' => '2026-10-12T12:00:00+03:00' ), 'android', 'en', strtotime( '2026-10-12T09:00:00Z' ) ) );
		$this->assertFalse( $this->shows( array( 'until' => '2026-10-11T00:00:00.000Z' ) ) );
	}

	public function test_a_date_that_cannot_be_read_sets_no_limit() {
		$this->assertTrue( $this->shows( array( 'from' => 'someday' ) ) );
		$this->assertTrue( $this->shows( array( 'until' => 'never' ) ) );
		$this->assertTrue(
			$this->shows(
				array(
					'from'  => 20261001,
					'until' => array( '2026-10-01' ),
				)
			)
		);
	}

	public function test_on_the_listed_platforms_only() {
		$ios = array( 'platforms' => array( 'ios' ) );
		$this->assertTrue( $this->shows( $ios, 'ios' ) );
		$this->assertFalse( $this->shows( $ios, 'android' ) );
		$this->assertTrue( $this->shows( array( 'platforms' => array( 'android', 'ios' ) ), 'android' ) );
		$this->assertFalse( $this->shows( array( 'platforms' => array() ), 'android' ) );
		$this->assertTrue( $this->shows( array( 'platforms' => 'ios' ), 'android' ) );
	}

	public function test_in_the_listed_languages_only_by_main_code() {
		$arabic = array( 'languages' => array( 'ar', 'tr' ) );
		$this->assertTrue( $this->shows( $arabic, 'android', 'ar' ) );
		$this->assertTrue( $this->shows( $arabic, 'android', 'ar-EG' ) );
		$this->assertTrue( $this->shows( $arabic, 'android', 'TR' ) );
		$this->assertFalse( $this->shows( $arabic, 'android', 'en' ) );
		$this->assertFalse( $this->shows( $arabic, 'android', '' ) );
		$this->assertTrue( $this->shows( array( 'languages' => array( 'ar-EG' ) ), 'android', 'ar' ) );
		$this->assertFalse( $this->shows( array( 'languages' => array() ), 'android', 'en' ) );
	}

	public function test_every_rule_must_let_the_block_on() {
		$show = array(
			'from'      => '2026-10-01T00:00:00Z',
			'platforms' => array( 'android' ),
			'languages' => array( 'ar' ),
		);
		$this->assertTrue( $this->shows( $show, 'android', 'ar' ) );
		$this->assertFalse( $this->shows( $show, 'ios', 'ar' ) );
		$this->assertFalse( $this->shows( $show, 'android', 'en' ) );
		$this->assertFalse( $this->shows( $show, 'android', 'ar', strtotime( '2026-09-01T00:00:00Z' ) ) );
	}

	public function test_page_background_and_header_picture() {
		$this->assertSame(
			array(
				'background'       => 'tint',
				'header_image_url' => 'https://cdn.test/top.jpg',
			),
			Pages::page_look(
				array(
					'background'       => 'tint',
					'header_image_url' => 'https://cdn.test/top.jpg',
				)
			)
		);
		$this->assertSame( 'surface', Pages::page_look( array( 'background' => 'surface' ) )['background'] );
		$this->assertSame(
			array(
				'background'       => 'none',
				'header_image_url' => null,
			),
			Pages::page_look( array() )
		);
		$this->assertSame( 'none', Pages::page_look( array( 'background' => 'primary' ) )['background'] );
		$this->assertNull( Pages::page_look( array( 'header_image_url' => 'http://cdn.test/top.jpg' ) )['header_image_url'] );
		$this->assertNull( Pages::page_look( array( 'header_image_url' => 'javascript:alert(1)' ) )['header_image_url'] );
		$this->assertNull( Pages::page_look( array( 'header_image_url' => array( 'https://cdn.test/top.jpg' ) ) )['header_image_url'] );
	}
}
