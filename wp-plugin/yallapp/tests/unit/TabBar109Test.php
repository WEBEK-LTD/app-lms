<?php
/**
 * 109 The bottom tabs' look and the More tab's name.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Pages;

class TabBar109Test extends TestCase {

	public function test_keeps_only_known_fields_in_range() {
		$this->assertSame(
			array(
				'background' => '#0E0D24',
				'active'     => '#FF5A1F',
				'radius'     => 16,
				'margin'     => 12,
				'font'       => 'Cairo',
				'labels'     => 'active',
				'center'     => 'cart',
			),
			Pages::tab_bar(
				array(
					'background'      => '#0e0d24',
					'dark_background' => 'black',
					'active'          => '#FF5A1F',
					'radius'          => 16,
					'margin'          => 12,
					'font'            => ' Cairo ',
					'labels'          => 'active',
					'center'          => 'cart',
					'script'          => '<b>',
				)
			)
		);
	}

	public function test_leaves_out_values_past_their_range_and_the_usual_ones() {
		$this->assertNull( Pages::tab_bar( array( 'radius' => 99, 'margin' => -1, 'labels' => 'always' ) ) );
		$this->assertNull( Pages::tab_bar( 'blue' ) );
	}

	public function test_names_the_more_tab_in_the_apps_language() {
		$this->assertSame( 'More', Pages::more_label( 'en' ) );
		$this->assertSame( 'المزيد', Pages::more_label( 'ar' ) );
		$this->assertSame( 'Daha fazla', Pages::more_label( 'tr' ) );
		$this->assertSame( 'More', Pages::more_label( 'sw' ) );
	}
}
