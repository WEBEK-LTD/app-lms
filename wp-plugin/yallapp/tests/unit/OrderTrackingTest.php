<?php
/**
 * 91.2 A WooCommerce order's shipment from the tracking plugins, and what the customer reads.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Commerce\Order_Tracking;
use Yallapp\Commerce\Order_Updates;

class OrderTrackingTest extends TestCase {

	public function test_no_tracking_is_no_shipment(): void {
		$this->assertNull( Order_Tracking::shipment( array() ) );
		// An item without a number or a link isn't a shipment yet.
		$this->assertNull( Order_Tracking::shipment( array( array( 'tracking_provider' => 'usps', 'tracking_number' => ' ' ) ) ) );
		$this->assertNull( Order_Tracking::shipment( array( 'not an item' ) ) );
	}

	public function test_a_custom_carrier_with_its_link(): void {
		$shipment = Order_Tracking::shipment(
			array(
				array(
					'tracking_provider'        => '',
					'custom_tracking_provider' => 'Aras Kargo',
					'custom_tracking_link'     => 'https://kargotakip.araskargo.com.tr/?code=3815602243',
					'tracking_number'          => '3815602243',
					'date_shipped'             => 1793000000,
				),
			)
		);
		$this->assertSame(
			array(
				'carrier'         => 'Aras Kargo',
				'tracking_number' => '3815602243',
				'tracking_url'    => 'https://kargotakip.araskargo.com.tr/?code=3815602243',
				'waybill'         => null,
				'shipped_at'      => gmdate( 'Y-m-d\TH:i:s\Z', 1793000000 ),
			),
			$shipment
		);
	}

	public function test_the_latest_item_and_the_plugins_own_link(): void {
		$items    = array(
			array(
				'tracking_provider' => 'usps',
				'tracking_number'   => 'OLD1',
				'date_shipped'      => 1793000000,
			),
			array(
				'tracking_provider' => 'royal-mail',
				'tracking_number'   => 'RM2',
				'date_shipped'      => 1793086400,
			),
		);
		$shipment = Order_Tracking::shipment(
			$items,
			static function ( $item ) {
				return array(
					'formatted_tracking_provider' => 'Royal Mail',
					'formatted_tracking_link'     => 'https://www.royalmail.com/track/' . $item['tracking_number'],
				);
			}
		);
		$this->assertSame( 'Royal Mail', $shipment['carrier'] );
		$this->assertSame( 'RM2', $shipment['tracking_number'] );
		$this->assertSame( 'https://www.royalmail.com/track/RM2', $shipment['tracking_url'] );

		// Without the plugin's names, the provider's slug in words.
		$this->assertSame( 'Royal Mail', Order_Tracking::shipment( $items )['carrier'] );
		$this->assertNull( Order_Tracking::shipment( $items )['tracking_url'] );
	}

	public function test_only_web_links(): void {
		$shipment = Order_Tracking::shipment(
			array(
				array(
					'tracking_number'      => 'A1',
					'custom_tracking_link' => 'javascript:alert(1)',
				),
			)
		);
		$this->assertNull( $shipment['tracking_url'] );
		$this->assertNull( $shipment['carrier'] );
	}

	public function test_a_new_number_is_a_new_shipment(): void {
		$one = Order_Tracking::shipment( array( array( 'custom_tracking_provider' => 'PTT', 'tracking_number' => 'A1', 'date_shipped' => 1 ) ) );
		$two = Order_Tracking::shipment( array( array( 'custom_tracking_provider' => 'PTT', 'tracking_number' => 'A1', 'date_shipped' => 2 ) ) );
		$new = Order_Tracking::shipment( array( array( 'custom_tracking_provider' => 'PTT', 'tracking_number' => 'B2', 'date_shipped' => 2 ) ) );
		$this->assertSame( Order_Tracking::fingerprint( $one ), Order_Tracking::fingerprint( $two ) );
		$this->assertNotSame( Order_Tracking::fingerprint( $one ), Order_Tracking::fingerprint( $new ) );
		$this->assertSame( '', Order_Tracking::fingerprint( null ) );
	}

	public function test_what_the_customer_reads(): void {
		$shipment = array(
			'carrier'         => 'Aras Kargo',
			'tracking_number' => '3815602243',
		);
		$this->assertSame(
			array(
				'title' => 'Order #1042',
				'body'  => 'Your order is on its way: Aras Kargo 3815602243. Tap to follow it.',
			),
			Order_Updates::shipped_text( '1042', $shipment )
		);
		$this->assertSame( 'New tracking details: Aras Kargo 3815602243. Tap to follow it.', Order_Updates::shipped_text( '1042', $shipment, true )['body'] );
		$this->assertSame( 'Your order is on its way. Tap to follow it.', Order_Updates::shipped_text( '7', array( 'carrier' => null, 'tracking_number' => null ) )['body'] );
		$this->assertSame( 'Your order was cancelled.', Order_Updates::status_text( '7', 'cancelled' )['body'] );
		$this->assertSame( 'Your order was refunded.', Order_Updates::status_text( '7', 'refunded' )['body'] );
		$this->assertSame( 'Your order is complete. Thank you!', Order_Updates::status_text( '7', 'completed' )['body'] );
	}
}
