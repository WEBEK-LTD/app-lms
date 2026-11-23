<?php
/**
 * 222.4 (169.5) A WordPress flower shop's card beginnings in each of the app's languages
 * (StoreConfig.gift_message.starters_by_language), the main ones kept for older apps.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Store\Delivery_Rules;

class GiftStarters222Test extends TestCase {

	public function test_the_main_beginnings_one_a_line() {
		$this->assertSame(
			array( 'Happy birthday!', 'With all my love' ),
			Delivery_Rules::starters( "  Happy birthday!\r\n\r\nWith   all my love\n" )
		);
		$this->assertSame( array(), Delivery_Rules::starters( '' ) );
	}

	public function test_at_most_six_of_at_most_80_characters() {
		$lines = Delivery_Rules::starters( implode( "\n", array( 'a', 'b', 'c', 'd', 'e', 'f', 'g' ) ) );
		$this->assertSame( array( 'a', 'b', 'c', 'd', 'e', 'f' ), $lines );
		$long = Delivery_Rules::starters( str_repeat( 'م', 120 ) );
		$this->assertSame( 80, mb_strlen( $long[0] ) );
	}

	public function test_each_language_its_own() {
		$this->assertSame(
			array(
				'ar' => array( 'عيد ميلاد سعيد!', 'مع كلِّ حبّي' ),
				'tr' => array( 'Doğum günün kutlu olsun!' ),
			),
			Delivery_Rules::starters_by_language(
				array(
					'en' => "  \n",
					'ar' => "عيد ميلاد سعيد!\nمع كلِّ حبّي",
					'tr' => 'Doğum günün kutlu olsun!',
					// A language the app doesn't ship is never sent.
					'fr' => 'Joyeux anniversaire !',
				)
			)
		);
	}

	public function test_none_written_sends_null() {
		$this->assertNull( Delivery_Rules::starters_by_language( array() ) );
		$this->assertNull(
			Delivery_Rules::starters_by_language(
				array(
					'en' => '',
					'ar' => "\n",
				)
			)
		);
	}

	public function test_the_languages_are_the_apps() {
		$this->assertSame( array( 'en', 'ar', 'tr' ), Delivery_Rules::STARTER_LANGUAGES );
	}
}
