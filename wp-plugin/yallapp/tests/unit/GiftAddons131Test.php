<?php
/**
 * 131 Gift add-ons on WooCommerce, the titles the owner words, and a flash sale on one product.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Store\Addon_Rules;
use Yallapp\Store\Delivery_Rules;

class GiftAddons131Test extends TestCase {

	private static function messages() {
		return array(
			'needs_item'  => 'needs item',
			'not_offered' => 'not offered',
		);
	}

	public function test_a_rule_keeps_what_it_needs_and_falls_back_to_every_product() {
		$this->assertSame(
			array(
				'offer_with'   => 'categories',
				'category_ids' => array( 12, 15 ),
				'product_ids'  => array(),
			),
			Addon_Rules::rule( 'categories', '12, 15,12 x', '7' )
		);
		$this->assertSame( 'all', Addon_Rules::rule( 'products', '', '' )['offer_with'] );
		$this->assertSame( 'all', Addon_Rules::rule( 'anything', '', '' )['offer_with'] );
	}

	public function test_an_add_on_goes_with_what_the_owner_chose() {
		$this->assertTrue( Addon_Rules::offered_with( Addon_Rules::rule( 'all', '', '' ), 20, array() ) );
		$this->assertTrue( Addon_Rules::offered_with( Addon_Rules::rule( 'categories', '12', '' ), 20, array( 3, 12 ) ) );
		$this->assertFalse( Addon_Rules::offered_with( Addon_Rules::rule( 'categories', '12', '' ), 20, array( 3 ) ) );
		$this->assertTrue( Addon_Rules::offered_with( Addon_Rules::rule( 'products', '', '20,21' ), 21, array() ) );
		$this->assertFalse( Addon_Rules::offered_with( Addon_Rules::rule( 'products', '', '20,21' ), 22, array() ) );
	}

	public function test_add_ons_alone_need_an_item() {
		$checked = Addon_Rules::check_lines(
			array(
				array(
					'product_id' => 30,
					'addon'      => true,
					'addon_of'   => 20,
				),
			),
			static function () {
				return true;
			},
			self::messages()
		);
		$this->assertTrue( $checked['needs_item'] );
	}

	public function test_each_add_on_needs_its_line_and_a_product_it_goes_with() {
		$lines   = array(
			array(
				'product_id' => 20,
				'addon'      => false,
			),
			array(
				'product_id' => 30,
				'addon'      => true,
				'addon_of'   => 20,
			),
			array(
				'product_id' => 31,
				'addon'      => true,
				'addon_of'   => 99,
			),
			array(
				'product_id' => 32,
				'addon'      => true,
				'addon_of'   => 20,
			),
			// An older app's line without its link: any main line it goes with.
			array(
				'product_id' => 33,
				'addon'      => true,
			),
		);
		$checked = Addon_Rules::check_lines(
			$lines,
			static function ( $index, $main ) use ( $lines ) {
				return 32 !== $lines[ $index ]['product_id'] && 20 === $main;
			},
			self::messages()
		);
		$this->assertFalse( $checked['needs_item'] );
		$this->assertSame(
			array(
				2 => 'needs item',
				3 => 'not offered',
			),
			$checked['problems']
		);
	}

	public function test_titles_are_per_language_trimmed_and_at_most_40_characters() {
		$this->assertSame(
			array(
				'addons'    => array(
					'en' => 'Make it extra special',
					'ar' => 'أضف لمسة أخرى',
				),
				'gift_card' => null,
				'delivery'  => array( 'tr' => str_repeat( 'a', 40 ) ),
			),
			Addon_Rules::titles(
				array(
					'addons'    => array(
						'en'  => '  Make it   extra special ',
						'ar'  => 'أضف لمسة أخرى',
						'EN1' => 'x',
						'fr'  => '   ',
					),
					'gift_card' => 'not a map',
					'delivery'  => array( 'tr' => str_repeat( 'a', 60 ) ),
				)
			)
		);
		$this->assertSame(
			array(
				'addons'    => null,
				'gift_card' => null,
				'delivery'  => null,
			),
			Addon_Rules::titles( null )
		);
	}

	public function test_the_flash_sale_title_in_other_languages_from_its_lines() {
		$this->assertSame(
			array(
				'ar' => 'عرض خاطف',
				'tr' => 'Flaş indirim',
			),
			Addon_Rules::lang_lines( "ar: عرض خاطف\nnot a line\ntr:Flaş indirim\n" )
		);
		$this->assertNull( Addon_Rules::lang_lines( '' ) );
	}

	public function test_a_flash_sale_on_one_product_is_on_that_one_only() {
		$sale = array(
			'product_ids' => array( 101 ),
			'category_id' => 0,
		);
		$this->assertTrue( Delivery_Rules::flash_covers( $sale, 101, false ) );
		$this->assertFalse( Delivery_Rules::flash_covers( $sale, 102, false ) );
		// Even in a category: the sale has none.
		$this->assertFalse( Delivery_Rules::flash_covers( $sale, 102, true ) );
		$category = array(
			'product_ids' => array(),
			'category_id' => 9,
		);
		$this->assertTrue( Delivery_Rules::flash_covers( $category, 102, true ) );
		$this->assertFalse( Delivery_Rules::flash_covers( $category, 103, false ) );
	}
}
