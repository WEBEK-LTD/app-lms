<?php
/**
 * 134 Paying inside the app on WooCommerce (Demo): Yallapp's signed request, the order's fields
 * and amounts, and what the plugin asks Yallapp for.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Store\In_App_Payment;
use Yallapp\Store\Paid_Order_Request;

if ( ! function_exists( 'wp_parse_url' ) ) {
	/**
	 * Minimal stand-in for WordPress's URL parser.
	 *
	 * @param string $url       URL.
	 * @param int    $component Component.
	 * @return mixed
	 */
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url
	}
}

class InAppPay134Test extends TestCase {

	/** Made up, shaped like a license key. */
	const KEY = 'ya-1234-abcd-5678-efgh';

	private static function request( array $patch = array() ) {
		return array_merge(
			array(
				'action'      => 'create',
				'reference'   => 'yallapp-order-42',
				'currency'    => 'TRY',
				'lines'       => array(
					array(
						'product_id'   => 41,
						'variation_id' => 57,
						'quantity'     => 2,
						'attributes'   => array( 'attribute_pa_size' => 'deluxe' ),
					),
					array(
						'product_id' => 88,
						'quantity'   => 1,
						'addon_of'   => 41,
					),
				),
				'coupon'      => 'SPRING',
				'extras'      => array(
					'delivery_date' => '2026-11-20',
					'delivery_slot' => 's2',
					'fee'           => 30,
					'sender'        => array(
						'name'  => 'Omar Aziz',
						'phone' => '+905301234567',
						'email' => 'omar@example.test',
					),
					'recipient'     => array(
						'name'    => 'Ayşe Aziz',
						'phone'   => '+905309876543',
						'address' => 'Moda Caddesi 5, Kadıköy',
						'city'    => 'Istanbul',
						'country' => 'TR',
					),
				),
				'customer_id' => 7,
				'billing'     => array(
					'name'    => 'Leyla Kaya',
					'phone'   => '+905321112233',
					'email'   => 'leyla@example.test',
					'city'    => 'Istanbul',
					'address' => 'Bağdat Caddesi 12',
					'country' => null,
				),
				'shipping'    => array(
					'name'    => 'Leyla Kaya',
					'address' => 'Bağdat Caddesi 12',
				),
				'platform'    => 'android',
				'payment'     => array(
					'gateway'        => 'Stripe',
					'transaction_id' => 'pi_madeUp123',
					'amount'         => '1075.00',
					'currency'       => 'TRY',
					'note'           => 'Paid in the app via Stripe, reference pi_madeUp123',
				),
			),
			$patch
		);
	}

	public function test_only_yallapp_signs_it_with_the_license_key_and_a_fresh_timestamp() {
		$now = 1795000000;
		$raw = (string) json_encode( self::request() );
		$sig = Paid_Order_Request::sign( self::KEY, $now, $raw );
		$this->assertSame( hash_hmac( 'sha256', 'yallapp-store-order:' . $now . ':' . $raw, strtoupper( self::KEY ) ), $sig );
		$this->assertTrue( Paid_Order_Request::verify( self::KEY, (string) $now, $sig, $raw, $now + 30 ) );
		$this->assertFalse( Paid_Order_Request::verify( self::KEY, (string) $now, $sig, $raw . ' ', $now ), 'another body' );
		$this->assertFalse( Paid_Order_Request::verify( 'ya-0000-0000-0000-0000', (string) $now, $sig, $raw, $now ), 'another key' );
		$this->assertFalse( Paid_Order_Request::verify( self::KEY, (string) $now, $sig, $raw, $now + 301 ), 'too old' );
		$this->assertFalse( Paid_Order_Request::verify( '', (string) $now, $sig, $raw, $now ), 'no key saved' );
		// The billing access request's signature never opens this one.
		$this->assertFalse( Paid_Order_Request::verify( self::KEY, (string) $now, hash_hmac( 'sha256', 'yallapp-billing-access:' . $now . ':' . $raw, strtoupper( self::KEY ) ), $raw, $now ) );
	}

	public function test_it_reads_the_order_and_its_payment_strictly() {
		$read = Paid_Order_Request::parse( self::request() );
		$this->assertSame( 'create', $read['action'] );
		$this->assertSame( 'yallapp-order-42', $read['reference'] );
		$this->assertSame( 57, $read['lines'][0]['variation_id'] );
		$this->assertSame( array( 'attribute_pa_size' => 'deluxe' ), $read['lines'][0]['attributes'] );
		$this->assertNull( $read['lines'][1]['variation_id'] );
		$this->assertSame( 41, $read['lines'][1]['addon_of'] );
		$this->assertSame( 'pi_madeUp123', $read['payment']['transaction_id'] );
		$this->assertSame( '1075.00', $read['payment']['amount'] );
		// A quote has no payment.
		$quote = Paid_Order_Request::parse( self::request( array( 'action' => 'quote', 'payment' => null ) ) );
		$this->assertNull( $quote['payment'] );
		foreach (
			array(
				array( 'action' => 'refund' ),
				array( 'reference' => 'order-42' ),
				array( 'currency' => 'lira' ),
				array( 'lines' => array() ),
				array( 'lines' => array( array( 'product_id' => 41, 'quantity' => 0 ) ) ),
				array( 'billing' => array( 'name' => 'Leyla' ) ),
				array( 'payment' => array( 'gateway' => 'Stripe', 'transaction_id' => 'pi_1', 'amount' => '10.00', 'currency' => 'EUR' ) ),
				array( 'payment' => array( 'gateway' => 'Stripe', 'amount' => '10.00', 'currency' => 'TRY' ) ),
			) as $patch
		) {
			$this->assertNull( Paid_Order_Request::parse( self::request( $patch ) ), (string) json_encode( $patch ) );
		}
	}

	public function test_billing_is_the_sender_and_shipping_the_recipient_as_in_the_gift_checkout() {
		$fields = Paid_Order_Request::address_fields( Paid_Order_Request::parse( self::request() ), 'TR' );
		$this->assertSame( 'Omar', $fields['billing_first_name'] );
		$this->assertSame( 'Aziz', $fields['billing_last_name'] );
		$this->assertSame( 'omar@example.test', $fields['billing_email'] );
		$this->assertSame( 'Bağdat Caddesi 12', $fields['billing_address_1'] );
		$this->assertSame( 'TR', $fields['billing_country'] );
		$this->assertSame( 'Ayşe', $fields['shipping_first_name'] );
		$this->assertSame( 'Moda Caddesi 5, Kadıköy', $fields['shipping_address_1'] );
		$this->assertSame( '+905309876543', $fields['shipping_phone'] );
		// Not a gift: the buyer pays and receives it, in the store's country unless told.
		$plain  = self::request(
			array(
				'extras'   => array(),
				'shipping' => array(),
			)
		);
		$fields = Paid_Order_Request::address_fields( Paid_Order_Request::parse( $plain ), 'EG' );
		$this->assertSame( 'Leyla', $fields['billing_first_name'] );
		$this->assertSame( 'Kaya', $fields['shipping_last_name'] );
		$this->assertSame( 'Bağdat Caddesi 12', $fields['shipping_address_1'] );
		$this->assertSame( 'EG', $fields['shipping_country'] );
		$this->assertSame( array( 'Cher', '' ), Paid_Order_Request::split_name( 'Cher' ) );
		$this->assertSame( array( 'Mary Ann', 'Smith' ), Paid_Order_Request::split_name( ' Mary  Ann Smith ' ) );
	}

	public function test_the_amounts_add_up_to_woocommerces_total_shown_with_or_without_tax() {
		// Prices without tax: the taxes (on the products and shipping) are a line of their own.
		$excl = Paid_Order_Request::amounts(
			array( 750.0, 100.0 ),
			array( 150.0, 20.0 ),
			array(
				'discount'     => 85.0,
				'discount_tax' => 17.0,
				'shipping'     => 25.0,
				'shipping_tax' => 5.0,
				'fees'         => 30.0,
				'fees_tax'     => 0.0,
				'total'        => 978.0,
			),
			false
		);
		$this->assertSame(
			array(
				'lines'    => array( '750.00', '100.00' ),
				'discount' => '85.00',
				'shipping' => '25.00',
				'fees'     => '30.00',
				'tax'      => '158.00',
				'total'    => '978.00',
			),
			$excl
		);
		// Prices with tax: nothing is left over for a tax line.
		$incl = Paid_Order_Request::amounts( array( 750.0, 100.0 ), array( 150.0, 20.0 ), array( 'discount' => 85.0, 'discount_tax' => 17.0, 'shipping' => 25.0, 'shipping_tax' => 5.0, 'fees' => 30.0, 'total' => 978.0 ), true );
		$this->assertSame( '0.00', $incl['tax'] );
		$this->assertSame( array( '900.00', '120.00' ), $incl['lines'] );
		$sum = array_sum( array_map( 'floatval', $incl['lines'] ) ) - (float) $incl['discount'] + (float) $incl['shipping'] + (float) $incl['fees'] + (float) $incl['tax'];
		$this->assertEqualsWithDelta( 978.0, $sum, 0.001 );
		// A cent of rounding below the parts is taken off as discount, never a negative tax.
		$round = Paid_Order_Request::amounts( array( 10.0 ), array( 0.0 ), array( 'total' => 9.99 ), true );
		$this->assertSame( '0.01', $round['discount'] );
		$this->assertSame( '0.00', $round['tax'] );
	}

	public function test_the_plugin_follows_the_dashboard_and_asks_yallapp_with_the_priced_cart() {
		$this->assertSame( 'platform', In_App_Payment::mode( array() ) );
		$this->assertSame( 'platform', In_App_Payment::mode( array( 'store_checkout' => array( 'payment' => 'in_app' ) ) ), 'no gateway' );
		$this->assertSame(
			'in_app',
			In_App_Payment::mode(
				array(
					'store_checkout' => array(
						'payment'      => 'in_app',
						'gateway'      => 'stripe',
						'gateway_name' => 'Stripe',
					),
				)
			)
		);
		$this->assertNull( In_App_Payment::of_status( array( 'payment' => 'platform' ) ) );
		$this->assertNull( In_App_Payment::of_status( 'in_app' ) );
		$body = In_App_Payment::start_body(
			array(
				array(
					'product_id'   => 41,
					'variation_id' => 57,
					'quantity'     => 2,
					'name'         => 'Red roses - Deluxe',
					'unit'         => 450,
					'total'        => 900,
					'attributes'   => array( 'attribute_pa_size' => 'deluxe' ),
					'addon_of'     => 0,
					'digital'      => false,
				),
			),
			'TRY',
			'SPRING',
			90.0,
			array( 'fee' => 30.0 ),
			array(
				'user_id' => 7,
				'name'    => 'Omar Aziz',
			),
			'android',
			'tr'
		);
		$this->assertSame( '900.00', $body['lines'][0]['total_amount'] );
		$this->assertNull( $body['lines'][0]['addon_of'] );
		$this->assertSame( '90.00', $body['discount_amount'] );
		$this->assertSame( '30.00', $body['fee_amount'] );
		$this->assertSame( 'SPRING', $body['coupon'] );
		$this->assertSame( 7, $body['customer']['user_id'] );
		// Only Yallapp's own payment page is opened.
		$this->assertTrue( In_App_Payment::is_platform_url( 'https://yallapp.com.tr/pay/abc', 'https://yallapp.com.tr/api/v1' ) );
		$this->assertFalse( In_App_Payment::is_platform_url( 'https://evil.test/pay/abc', 'https://yallapp.com.tr/api/v1' ) );
		$this->assertFalse( In_App_Payment::is_platform_url( 'http://yallapp.com.tr/pay/abc', 'https://yallapp.com.tr/api/v1' ) );
		$this->assertTrue( In_App_Payment::is_platform_url( 'http://localhost/pay/abc', 'http://localhost/api/v1' ) );
	}
}
