<?php
/**
 * 132 Delivery stages as WooCommerce statuses: Shipped, Delivery postponed, Delivery failed and
 * Returned to shop; what the app reads and what the customer is told.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Commerce\Delivery_Stages;
use Yallapp\Commerce\Order_Updates;
use Yallapp\Commerce\Woo_Orders;

class DeliveryStages132Test extends TestCase {

	public function test_the_statuses_are_the_app_stages(): void {
		$this->assertSame( 'shipped', Delivery_Stages::stage_of( 'wc-shipped' ) );
		$this->assertSame( 'postponed', Delivery_Stages::stage_of( 'postponed' ) );
		$this->assertSame( 'failed', Delivery_Stages::stage_of( 'wc-failed-delivery' ) );
		$this->assertSame( 'returned', Delivery_Stages::stage_of( 'returned' ) );
		// WooCommerce's own statuses aren't stages; Completed is delivered.
		$this->assertNull( Delivery_Stages::stage_of( 'processing' ) );
		$this->assertNull( Delivery_Stages::stage_of( 'completed' ) );
		$this->assertNull( Delivery_Stages::stage_of( 'failed' ) );
	}

	public function test_apps_that_dont_know_stages_see_the_order_in_progress(): void {
		foreach ( array( 'shipped', 'postponed', 'failed-delivery', 'returned' ) as $status ) {
			$this->assertSame( 'processing', Woo_Orders::STATUSES[ $status ] );
		}
		$this->assertSame( 'out_for_delivery', Woo_Orders::fulfilment_status( 'wc-shipped' ) );
		$this->assertSame( 'preparing', Woo_Orders::fulfilment_status( 'postponed' ) );
		$this->assertSame( 'preparing', Woo_Orders::fulfilment_status( 'failed-delivery' ) );
	}

	public function test_the_order_page_lists_them_after_processing(): void {
		$statuses = Delivery_Stages::order_statuses(
			array(
				'wc-pending'    => 'Pending payment',
				'wc-processing' => 'Processing',
				'wc-completed'  => 'Completed',
			)
		);
		$this->assertSame(
			array( 'wc-pending', 'wc-processing', 'wc-shipped', 'wc-postponed', 'wc-failed-delivery', 'wc-returned', 'wc-completed' ),
			array_keys( $statuses )
		);
		$this->assertSame( 'Delivery failed', $statuses['wc-failed-delivery'] );
		// Paid like Processing, for reports and downloads.
		$this->assertSame( array( 'processing', 'completed', 'shipped', 'postponed', 'failed-delivery', 'returned' ), Delivery_Stages::paid_statuses( array( 'processing', 'completed' ) ) );
	}

	public function test_the_stage_in_the_app_with_the_shops_note_as_its_reason(): void {
		$this->assertNull( Delivery_Stages::stage_json( 'processing', 'Processing', 1793000000, null ) );
		$stage = Delivery_Stages::stage_json( 'postponed', 'Delivery postponed', 1793000000, "<p>The recipient is away until Friday.\nWe will bring it Saturday morning.</p>" );
		$this->assertSame( 'postponed', $stage['code'] );
		$this->assertSame( 'Delivery postponed', $stage['label'] );
		$this->assertSame( gmdate( 'Y-m-d\TH:i:s\Z', 1793000000 ), $stage['at'] );
		$this->assertSame( 'The recipient is away until Friday. We will bring it Saturday morning.', $stage['reason'] );
		$this->assertNull( $stage['date'] );
		$this->assertNull( $stage['next_step'] );
		// A long note is cut at a word.
		$long = Delivery_Stages::reason( str_repeat( 'Rain all day in Kadıköy ', 12 ) );
		$this->assertLessThanOrEqual( Delivery_Stages::REASON_LENGTH + 1, mb_strlen( $long ) );
		$this->assertStringEndsWith( '…', $long );
		$this->assertNull( Delivery_Stages::reason( '  ' ) );
	}

	public function test_a_cancel_after_a_failed_delivery_needs_a_refund(): void {
		$this->assertTrue( Delivery_Stages::refund_due_after( 'wc-failed-delivery', 'wc-cancelled' ) );
		$this->assertTrue( Delivery_Stages::refund_due_after( 'returned', 'cancelled' ) );
		$this->assertFalse( Delivery_Stages::refund_due_after( 'processing', 'cancelled' ) );
		$this->assertFalse( Delivery_Stages::refund_due_after( 'failed-delivery', 'shipped' ) );
	}

	public function test_what_the_customer_is_told(): void {
		$this->assertSame( array( 'shipped', 'postponed', 'failed-delivery' ), Order_Updates::TOLD_STAGES );
		$this->assertSame(
			array(
				'title' => 'Order #2051',
				'body'  => 'Your delivery was postponed. Saturday morning instead.',
			),
			Delivery_Stages::text( '2051', 'postponed', 'Saturday morning instead.' )
		);
		$this->assertSame( "We couldn't deliver your order.", Delivery_Stages::text( '2051', 'wc-failed-delivery' )['body'] );
		// Shipped says where to follow it, never the shop's note.
		$this->assertSame( 'Your order is on its way. Tap to follow it.', Delivery_Stages::text( '2051', 'shipped', 'Courier: Ali' )['body'] );
		$this->assertNull( Delivery_Stages::text( '2051', 'completed' ) );
	}
}
