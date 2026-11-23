<?php
/**
 * 212 The wishlist, reviews from customers who bought, back in stock and the filters' pure parts.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Store\Shop_Features;

class ShopFeatures212Test extends TestCase {

	public function test_a_review_shows_a_first_name_and_an_initial_only() {
		$this->assertSame( 'Ahmed K.', Shop_Features::short_name( 'Ahmed Kamal' ) );
		$this->assertSame( 'أحمد ك.', Shop_Features::short_name( 'أحمد محمد كمال' ) );
		$this->assertSame( 'Sara', Shop_Features::short_name( 'Sara' ) );
		// Never an email or a phone.
		$this->assertStringNotContainsString( '@', Shop_Features::short_name( 'sara@mail.test' ) );
		$this->assertSame( '', Shop_Features::short_name( '' ) );
	}

	public function test_a_review_is_checked() {
		$this->assertTrue( Shop_Features::read_review( 4, ' Fits well ' )['ok'] );
		$this->assertSame( 'Fits well', Shop_Features::read_review( 4, ' Fits well ' )['text'] );
		$this->assertFalse( Shop_Features::read_review( 6, '' )['ok'] );
		$this->assertFalse( Shop_Features::read_review( '5', '' )['ok'] );
		$this->assertFalse( Shop_Features::read_review( 3, str_repeat( 'a', 2001 ) )['ok'] );
		$this->assertFalse( Shop_Features::read_review( 3, 'see https://a.test and www.b.test' )['ok'] );
		$this->assertTrue( Shop_Features::read_review( 3, 'see https://a.test' )['ok'] );
	}

	public function test_a_wait_is_one_user_meta_row_by_product_and_variation() {
		$this->assertSame( 'yallapp_stock_wait_12_0', Shop_Features::stock_key( 12, 0 ) );
		$this->assertSame( 'yallapp_stock_wait_12_34', Shop_Features::stock_key( 12, 34 ) );
	}

	public function test_sizes_and_colours_are_known_by_their_names_in_three_languages() {
		$this->assertSame( 'size', Shop_Features::facet_key( 'size', 'Size' ) );
		$this->assertSame( 'size', Shop_Features::facet_key( 'beden', 'Beden' ) );
		$this->assertSame( 'colour', Shop_Features::facet_key( 'color', 'Color' ) );
		$this->assertSame( 'colour', Shop_Features::facet_key( 'lwn', 'اللون' ) );
		$this->assertSame( 'material', Shop_Features::facet_key( 'material', 'Material' ) );
	}
}
