<?php
/**
 * 81.2 What the site looks like: its palette's brand colours and its menus.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Site_Brand;

class SiteBrandTest extends TestCase {

	public function test_colours_brand_slugs_first_without_greys() {
		$palette = array(
			'default' => array(
				array( 'slug' => 'vivid-red', 'color' => '#cf2e2e' ),
			),
			'theme'   => array(
				array( 'slug' => 'base', 'color' => '#FFFFFF' ),
				array( 'slug' => 'contrast', 'color' => '#111111' ),
				array( 'slug' => 'secondary', 'color' => '#F2A33A' ),
				array( 'slug' => 'primary', 'color' => '#1f7a5c' ),
				array( 'slug' => 'tertiary', 'color' => '#abc' ),
				array( 'slug' => 'grey', 'color' => '#777777' ),
			),
			'custom'  => array(
				array( 'slug' => 'brand-pink', 'color' => '#e85d75' ),
			),
		);
		// The site's own colours (custom, theme), never WordPress's defaults.
		$this->assertSame( array( '#1f7a5c', '#e85d75', '#f2a33a', '#aabbcc' ), Site_Brand::palette_colors( $palette ) );
		// A flat list too, at most six, without repeats.
		$flat = array();
		foreach ( array( '#ff0000', '#ff0000', '#00aa00', '#0000ff', '#aa00aa', '#00aaaa', '#aaaa00', '#123abc' ) as $i => $color ) {
			$flat[] = array(
				'slug'  => 'c' . $i,
				'color' => $color,
			);
		}
		$this->assertCount( 6, Site_Brand::palette_colors( $flat ) );
		$this->assertSame( '#ff0000', Site_Brand::palette_colors( $flat )[0] );
		$this->assertSame( array(), Site_Brand::palette_colors( array() ) );
		$this->assertNull( Site_Brand::hex( 'var(--x)' ) );
		$this->assertSame( '#1f7a5c', Site_Brand::hex( '#1F7A5CFF' ) );
	}

	public function test_menus_two_levels_deep() {
		$items = array(
			(object) array( 'ID' => 1, 'title' => 'Home', 'url' => 'https://cedar.example/', 'menu_item_parent' => '0' ),
			(object) array( 'ID' => 2, 'title' => 'Courses', 'url' => 'https://cedar.example/courses/', 'menu_item_parent' => '0' ),
			(object) array( 'ID' => 3, 'title' => 'Design', 'url' => 'https://cedar.example/courses/design/', 'menu_item_parent' => '2' ),
			// Third level: joins its top-level item.
			(object) array( 'ID' => 4, 'title' => 'Logo design', 'url' => 'https://cedar.example/courses/design/logo/', 'menu_item_parent' => '3' ),
			(object) array( 'ID' => 5, 'title' => '<b>About</b>   us', 'url' => 'https://cedar.example/about/', 'menu_item_parent' => '0' ),
			// Not an address the app can open, or without a title: left out.
			(object) array( 'ID' => 6, 'title' => 'Call', 'url' => 'tel:+905321234567', 'menu_item_parent' => '0' ),
			(object) array( 'ID' => 7, 'title' => '', 'url' => 'https://cedar.example/x/', 'menu_item_parent' => '0' ),
		);
		$this->assertSame(
			array(
				array(
					'title'    => 'Home',
					'url'      => 'https://cedar.example/',
					'children' => array(),
				),
				array(
					'title'    => 'Courses',
					'url'      => 'https://cedar.example/courses/',
					'children' => array(
						array(
							'title' => 'Design',
							'url'   => 'https://cedar.example/courses/design/',
						),
						array(
							'title' => 'Logo design',
							'url'   => 'https://cedar.example/courses/design/logo/',
						),
					),
				),
				array(
					'title'    => 'About us',
					'url'      => 'https://cedar.example/about/',
					'children' => array(),
				),
			),
			Site_Brand::menu_tree( $items )
		);
		$many = array();
		for ( $i = 1; $i <= 40; $i++ ) {
			$many[] = array( 'ID' => $i, 'title' => 'Item ' . $i, 'url' => 'https://cedar.example/' . $i . '/', 'menu_item_parent' => 0 );
		}
		$this->assertCount( Site_Brand::MAX_ITEMS, Site_Brand::menu_tree( $many ) );
	}

	public function test_text_and_addresses_are_kept_short() {
		$this->assertSame( 'A B', Site_Brand::text( "  A \n  B ", 10 ) );
		$this->assertSame( 'abc', Site_Brand::text( 'abcdef', 3 ) );
		$this->assertNull( Site_Brand::url( 'javascript:alert(1)' ) );
		$this->assertNull( Site_Brand::url( 'https://x.example/' . str_repeat( 'a', 500 ) ) );
		$this->assertSame( 'https://x.example/logo.png', Site_Brand::url( ' https://x.example/logo.png ' ) );
	}
}
