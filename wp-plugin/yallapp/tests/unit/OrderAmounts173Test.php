<?php
/**
 * 173 What a WooCommerce order's total is made of, as the app draws it.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Commerce\Order_Amounts;

class OrderAmounts173Test extends TestCase {

	/**
	 * Like wc_price's text: "MAD 480.00".
	 *
	 * @param float $amount Amount.
	 * @return string
	 */
	public static function mad( $amount ) {
		return ( $amount < 0 ? '-' : '' ) . 'MAD ' . number_format( abs( $amount ), 2, '.', ',' );
	}

	/**
	 * The tester's order #1057 on WooCommerce: 480 less 48 (LEQAA10), the Marrakech shipping and the slot's fee line.
	 *
	 * @return array
	 */
	private function order_1057() {
		return array(
			'incl'         => false,
			'subtotal'     => 480.0,
			'subtotal_tax' => 0.0,
			'discount'     => 48.0,
			'discount_tax' => 0.0,
			'coupons'      => array( 'leqaa10' ),
			'shipping'     => 30.0,
			'shipping_tax' => 0.0,
			'zone'         => 'Marrakech',
			'fees'         => array(
				array(
					'name'  => 'Delivery time 10:00–13:00',
					'total' => 20.0,
					'tax'   => 0.0,
				),
			),
			'slot_label'   => '10:00–13:00',
			'tax'          => 0.0,
			'tax_label'    => '',
			'total'        => 482.0,
		);
	}

	public function test_the_coupon_the_shipping_and_the_slots_fee_add_up_to_the_total(): void {
		$this->assertSame(
			array(
				'subtotal' => 'MAD 480.00',
				'discount' => array(
					'code'   => 'leqaa10',
					'amount' => 'MAD 48.00',
				),
				'points'   => null,
				'shipping' => array(
					'zone'   => 'Marrakech',
					'amount' => 'MAD 30.00',
				),
				'slot_fee' => 'MAD 20.00',
				'fees'     => array(),
				'tax'      => null,
				'total'    => 'MAD 482.00',
			),
			Order_Amounts::amounts( $this->order_1057(), array( self::class, 'mad' ) )
		);
	}

	public function test_another_fee_line_stays_a_fee_and_no_coupon_or_shipping_is_null(): void {
		$parts = array_merge(
			$this->order_1057(),
			array(
				'discount'   => 0.0,
				'coupons'    => array(),
				'shipping'   => 0.0,
				'zone'       => '',
				'slot_label' => '',
				'fees'       => array(
					array(
						'name'  => 'Gift wrap',
						'total' => 15.0,
						'tax'   => 0.0,
					),
					array(
						'name'  => 'Nothing',
						'total' => 0.0,
						'tax'   => 0.0,
					),
				),
				'total'      => 495.0,
			)
		);
		$amounts = Order_Amounts::amounts( $parts, array( self::class, 'mad' ) );
		$this->assertNull( $amounts['discount'] );
		$this->assertNull( $amounts['shipping'] );
		$this->assertNull( $amounts['slot_fee'] );
		$this->assertSame(
			array(
				array(
					'label'  => 'Gift wrap',
					'amount' => 'MAD 15.00',
				),
			),
			$amounts['fees']
		);
		$this->assertSame( 'MAD 495.00', $amounts['total'] );
	}

	public function test_prices_shown_with_tax_carry_it_and_say_it_is_included(): void {
		$parts   = array(
			'incl'         => true,
			'subtotal'     => 400.0,
			'subtotal_tax' => 80.0,
			'discount'     => 40.0,
			'discount_tax' => 8.0,
			'coupons'      => array( 'A', 'B' ),
			'shipping'     => 25.0,
			'shipping_tax' => 5.0,
			'zone'         => 'Flat rate',
			'fees'         => array(),
			'slot_label'   => '',
			'tax'          => 77.0,
			'tax_label'    => 'VAT',
			'total'        => 462.0,
		);
		$amounts = Order_Amounts::amounts( $parts, array( self::class, 'mad' ) );
		$this->assertSame( 'MAD 480.00', $amounts['subtotal'] );
		$this->assertSame(
			array(
				'code'   => 'A, B',
				'amount' => 'MAD 48.00',
			),
			$amounts['discount']
		);
		$this->assertSame( 'MAD 30.00', $amounts['shipping']['amount'] );
		$this->assertSame(
			array(
				'label'    => 'VAT',
				'included' => true,
				'amount'   => 'MAD 77.00',
			),
			$amounts['tax']
		);
		// 480 - 48 + 30 = 462: the tax is inside the lines.
		$this->assertSame( 'MAD 462.00', $amounts['total'] );
	}
}
