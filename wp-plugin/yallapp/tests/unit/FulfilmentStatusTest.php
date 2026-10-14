<?php
/**
 * 26 WooCommerce statuses as the app's fulfilment steps (restaurants and cafés).
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Commerce\Woo_Orders;

class FulfilmentStatusTest extends TestCase {

	public function test_statuses_map_to_steps_where_one_fits() {
		$this->assertSame( 'preparing', Woo_Orders::fulfilment_status( 'processing' ) );
		$this->assertSame( 'preparing', Woo_Orders::fulfilment_status( 'wc-processing' ) );
		$this->assertSame( 'received', Woo_Orders::fulfilment_status( 'on-hold' ) );
		$this->assertSame( 'completed', Woo_Orders::fulfilment_status( 'completed' ) );
		$this->assertSame( 'cancelled', Woo_Orders::fulfilment_status( 'cancelled' ) );
		$this->assertSame( 'cancelled', Woo_Orders::fulfilment_status( 'refunded' ) );
		$this->assertSame( 'cancelled', Woo_Orders::fulfilment_status( 'failed' ) );
	}

	public function test_unpaid_and_unknown_statuses_have_no_step() {
		$this->assertNull( Woo_Orders::fulfilment_status( 'pending' ) );
		$this->assertNull( Woo_Orders::fulfilment_status( 'checkout-draft' ) );
		$this->assertNull( Woo_Orders::fulfilment_status( 'some-plugin-status' ) );
	}
}
