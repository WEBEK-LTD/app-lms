<?php
/**
 * 91.1 A WooCommerce coupon in the app's cart: what it takes off, or why it doesn't apply.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Store\Coupon_Quote;

class CouponQuoteTest extends TestCase {

	private static function coupon( array $props = array() ) {
		return array_merge(
			array(
				'status'      => 'publish',
				'type'        => 'percent',
				'amount'      => 10.0,
				'expires'     => null,
				'usage_limit' => 0,
				'usage_count' => 0,
				'minimum'     => 0.0,
				'maximum'     => 0.0,
				'restricted'  => false,
				'money'       => static function ( $amount ) {
					return '₺' . number_format( (float) $amount, 2 );
				},
			),
			$props
		);
	}

	public function test_whole_cart_coupons_are_worked_out() {
		$this->assertSame( 45.0, Coupon_Quote::discount( 'percent', 10, 450, 3 ) );
		$this->assertSame( 50.0, Coupon_Quote::discount( 'fixed_cart', 50, 450, 3 ) );
		$this->assertSame( 30.0, Coupon_Quote::discount( 'fixed_product', 10, 450, 3 ) );
		// Never more than the subtotal.
		$this->assertSame( 20.0, Coupon_Quote::discount( 'fixed_cart', 50, 20, 1 ) );
		$this->assertNull( Coupon_Quote::discount( 'recurring_percent', 10, 450, 3 ) );
	}

	public function test_an_applied_coupon_comes_with_its_discount() {
		$this->assertSame(
			array(
				'json'     => array(
					'code'    => 'spring10',
					'status'  => 'applied',
					'message' => null,
				),
				'discount' => 90.0,
			),
			Coupon_Quote::evaluate( 'spring10', self::coupon(), 900.0, 2, 1000 )
		);
	}

	public function test_it_says_why_a_coupon_does_not_apply() {
		$message = static function ( array $props, $subtotal = 900.0 ) {
			$result = Coupon_Quote::evaluate( 'x', self::coupon( $props ), $subtotal, 2, 1000 );
			return array( $result['json']['status'], $result['json']['message'], $result['discount'] );
		};
		$this->assertSame( array( 'invalid', 'This coupon doesn\'t exist.', 0.0 ), $message( array( 'status' => 'draft' ) ) );
		$this->assertSame( array( 'invalid', 'This coupon has expired.', 0.0 ), $message( array( 'expires' => 999 ) ) );
		$this->assertSame( array( 'invalid', 'This coupon has been used up.', 0.0 ), $message( array( 'usage_limit' => 5, 'usage_count' => 5 ) ) );
		$this->assertSame( array( 'invalid', 'This coupon is for orders of ₺1,000.00 or more.', 0.0 ), $message( array( 'minimum' => 1000.0 ) ) );
		$this->assertSame( array( 'invalid', 'This coupon is for orders up to ₺500.00.', 0.0 ), $message( array( 'maximum' => 500.0 ) ) );
		// Rules about products, categories or customers: WooCommerce's checkout decides.
		$this->assertSame( array( 'at_checkout', 'This coupon is checked at checkout.', 0.0 ), $message( array( 'restricted' => true ) ) );
		$this->assertSame( array( 'at_checkout', 'This coupon is checked at checkout.', 0.0 ), $message( array( 'type' => 'sign_up_fee' ) ) );
	}
}
