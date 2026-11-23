<?php
/**
 * 157.7 A WordPress shop's Leqaa pages show the shop's WooCommerce categories, as the hosted
 * pages do (platform/web/tests/unit/phase157-app-categories.test.ts).
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Shop_Categories;

class ShopCategoriesTest extends TestCase {

	const SHOP = array( 'type' => 'screen', 'screen' => 'search' );

	/**
	 * The shop's categories as Block_Resolver::categories( 'products' ) gives them.
	 *
	 * @return array[]
	 */
	private static function woo() {
		return array(
			array( 'id' => 31, 'name' => 'Wedding', 'count' => 4, 'image_url' => 'https://shop.example/wedding.jpg' ),
			array( 'id' => 32, 'name' => 'Love', 'count' => 2, 'image_url' => null ),
			array( 'id' => 33, 'name' => 'Office plants', 'count' => 7, 'image_url' => 'https://shop.example/plants.jpg' ),
		);
	}

	/**
	 * Leqaa's occasion rings, served in English.
	 *
	 * @return array
	 */
	private static function rings() {
		return array(
			'id'     => 'occasions',
			'type'   => 'stories',
			'slides' => array(
				array( 'heading' => 'Love', 'image_url' => 'https://yallapp.test/love.jpg', 'action' => self::SHOP ),
				array( 'heading' => 'Birthday', 'subheading' => 'For them', 'image_url' => 'https://yallapp.test/cake.jpg', 'action' => self::SHOP ),
			),
		);
	}

	public function test_the_occasion_rings_are_the_shops_categories() {
		$this->assertSame( 'stories', Shop_Categories::list_kind( self::rings() ) );
		$served = ( new Shop_Categories( self::woo() ) )->apply( self::rings() );
		$this->assertSame( array( 'Wedding', 'Love', 'Office plants' ), array_column( $served['slides'], 'heading' ) );
		$this->assertSame( array( '31', '32', '33' ), array_column( array_column( $served['slides'], 'action' ), 'category_id' ) );
		// Its photo, else the template's at its place; no template line left under it.
		$this->assertSame( 'https://shop.example/wedding.jpg', $served['slides'][0]['image_url'] );
		$this->assertSame( 'https://yallapp.test/cake.jpg', $served['slides'][1]['image_url'] );
		$this->assertArrayNotHasKey( 'subheading', $served['slides'][1] );
	}

	public function test_in_arabic_and_turkish_too() {
		$rings                        = self::rings();
		$rings['slides'][0]['heading'] = 'حب';
		$rings['slides'][1]['heading'] = 'Doğum günü';
		$served                       = ( new Shop_Categories( self::woo() ) )->apply( $rings );
		$this->assertSame( array( 'Wedding', 'Love', 'Office plants' ), array_column( $served['slides'], 'heading' ) );
	}

	public function test_without_categories_the_template_stays() {
		$this->assertSame( self::rings(), ( new Shop_Categories( array() ) )->apply( self::rings() ) );
	}

	public function test_a_list_the_owner_changed_is_theirs() {
		$rings                         = self::rings();
		$rings['slides'][1]['heading'] = 'Our picks';
		$served                        = ( new Shop_Categories( self::woo() ) )->apply( $rings );
		$this->assertSame( array( 'Love', 'Our picks' ), array_column( $served['slides'], 'heading' ) );
		// Its "Love" still opens the shop's Love.
		$this->assertSame( '32', $served['slides'][0]['action']['category_id'] );
		$this->assertSame( self::SHOP, $served['slides'][1]['action'] );
	}

	public function test_the_bento_keeps_its_tiles_with_no_hole() {
		$bento  = array(
			'id'      => 'collections',
			'type'    => 'bento',
			'columns' => 2,
			'entries' => array(
				array( 'title' => 'Signature bouquets', 'image_url' => 'https://yallapp.test/a.jpg', 'action' => self::SHOP ),
				array( 'title' => 'Roses', 'image_url' => 'https://yallapp.test/b.jpg', 'action' => self::SHOP ),
				array( 'title' => 'Plants', 'image_url' => 'https://yallapp.test/c.jpg', 'action' => self::SHOP ),
				array( 'title' => 'Tulips', 'image_url' => 'https://yallapp.test/d.jpg', 'action' => self::SHOP ),
			),
		);
		$served = ( new Shop_Categories( self::woo() ) )->apply( $bento );
		$this->assertSame( array( 'Wedding', 'Love', 'Office plants' ), array_column( $served['entries'], 'title' ) );
		$this->assertSame( 'https://yallapp.test/b.jpg', $served['entries'][1]['image_url'] );
		// Three small tiles in two columns: the last spans both.
		$this->assertSame( 'wide', $served['entries'][2]['size'] );
		$this->assertArrayNotHasKey( 'size', $served['entries'][1] );
	}

	public function test_the_ticker_and_the_chips() {
		$ticker = array(
			'id'   => 'ticker',
			'type' => 'marquee',
			'text' => "Love\nBirthday\nSympathy\nNew baby\nCongratulations\nThank you",
		);
		$this->assertSame( "Wedding\nLove\nOffice plants", ( new Shop_Categories( self::woo() ) )->apply( $ticker )['text'] );
		$chip  = static function ( $id, $word ) {
			return array(
				'id'       => $id,
				'type'     => 'row',
				'action'   => self::SHOP,
				'children' => array(
					array( 'id' => $id . 'i', 'type' => 'icon', 'icon' => 'favorite' ),
					array( 'id' => $id . 't', 'type' => 'text', 'text' => $word ),
				),
			);
		};
		$chips = array(
			'id'       => 'chips',
			'type'     => 'row',
			'children' => array( $chip( 'c1', 'Love' ), $chip( 'c2', 'Birthday' ) ),
		);
		$served = ( new Shop_Categories( self::woo() ) )->apply( $chips );
		$this->assertCount( 3, $served['children'] );
		$this->assertSame( 'Office plants', $served['children'][2]['children'][1]['text'] );
		$this->assertSame( 'local_florist', $served['children'][2]['children'][0]['icon'] );
		$this->assertSame( array( 'c1', 'c2', 'c2-2' ), array_column( $served['children'], 'id' ) );
		$this->assertSame( '33', $served['children'][2]['action']['category_id'] );
	}

	public function test_a_button_named_like_a_category_opens_it() {
		$button = array(
			'id'     => 'b',
			'type'   => 'button',
			'text'   => 'love',
			'action' => self::SHOP,
		);
		$this->assertSame( '32', ( new Shop_Categories( self::woo() ) )->apply( $button )['action']['category_id'] );
		// A category the shop no longer lists opens the shop.
		$gone = array( 'action' => array( 'category_id' => '99' ) + self::SHOP ) + $button;
		$gone['text'] = 'Something else';
		$this->assertSame( self::SHOP, ( new Shop_Categories( self::woo() ) )->apply( $gone )['action'] );
		$this->assertTrue( Shop_Categories::shown_in( $button ) );
		$this->assertFalse( Shop_Categories::shown_in( array( 'id' => 'x', 'type' => 'text', 'text' => 'Love' ) ) );
	}
}
