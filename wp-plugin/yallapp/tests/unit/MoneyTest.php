<?php
/**
 * Prices as the app shows them.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Commerce\Money;

class MoneyTest extends TestCase {

	/**
	 * WooCommerce's sale price HTML (wc_format_sale_price), as Tutor LMS shows a course sold
	 * with WooCommerce.
	 */
	const SALE = '<div class="price"><del aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#36;</span>300.00</bdi></span></del> <span class="screen-reader-text">Original price was: &#036;300.00.</span><ins aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#36;</span>250.00</bdi></span></ins><span class="screen-reader-text">Current price is: &#036;250.00.</span></div>';

	public function test_plain_drops_markup_and_screen_reader_text() {
		$this->assertSame( '$300.00 $250.00', Money::plain( self::SALE ) );
		$this->assertSame( '₺450.00', Money::plain( '<span>&#8378;</span>450.00' ) );
	}

	public function test_current_is_the_price_paid_now() {
		// 39 Was "$300.00 Original price was: $300.00.$250.00Current price is: $250.00." in the app.
		$this->assertSame( '$250.00', Money::current( self::SALE ) );
		$this->assertSame( '₺450.00', Money::current( '<span>&#8378;</span>450.00' ) );
		$this->assertSame( '$300.00', Money::current( '<del>$300.00</del>' ) );
	}
}
