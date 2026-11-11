<?php
/**
 * 119 The bottom bar's designs, its dark colours and the account tab's photo.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Pages;

class TabBar119Test extends TestCase {

	public function test_keeps_the_design_the_dark_colours_and_the_photo() {
		$this->assertSame(
			array(
				'design'        => 'island',
				'active'        => '#1F6F5C',
				'dark_active'   => '#F5B700',
				'dark_inactive' => '#A3ADA8',
				'avatar'        => true,
			),
			Pages::tab_bar(
				array(
					'design'        => 'island',
					'active'        => '#1F6F5C',
					'dark_active'   => '#f5b700',
					'dark_inactive' => '#A3ADA8',
					'avatar'        => true,
				)
			)
		);
	}

	public function test_leaves_out_an_unknown_design_and_a_photo_that_isnt_yes() {
		$this->assertNull( Pages::tab_bar( array( 'design' => 'neon', 'avatar' => 'yes', 'dark_active' => 'gold' ) ) );
	}
}
