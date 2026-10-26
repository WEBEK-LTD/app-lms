<?php
/**
 * 86.4 The shop's totals of the last days, as the license check sends them.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Site_Sales;

class SiteSalesTest extends TestCase {

	public function test_each_day_in_the_sites_time_zone_with_its_orders_and_refunds() {
		$zone  = new \DateTimeZone( 'Europe/Istanbul' );
		$today = new \DateTimeImmutable( '2026-10-12 00:00:00', $zone );
		$at    = static function ( $local ) use ( $zone ) {
			return ( new \DateTimeImmutable( $local, $zone ) )->getTimestamp();
		};
		$paid  = array(
			// Paid at 23:30 on the 6th in Istanbul (20:30 UTC): the 6th.
			array( 'at' => $at( '2026-10-06 23:30' ), 'currency' => 'TRY', 'total' => 450.0, 'refunded' => 50.0 ),
			array( 'at' => $at( '2026-10-06 10:00' ), 'currency' => 'TRY', 'total' => 100.5, 'refunded' => 0.0 ),
			array( 'at' => $at( '2026-10-07 09:00' ), 'currency' => 'USD', 'total' => 20.0, 'refunded' => 0.0 ),
			// Before the eight days, or not a currency: left out.
			array( 'at' => $at( '2026-10-04 23:59' ), 'currency' => 'TRY', 'total' => 999.0, 'refunded' => 0.0 ),
			array( 'at' => $at( '2026-10-08 09:00' ), 'currency' => 'tl', 'total' => 1.0, 'refunded' => 0.0 ),
		);
		$refunds = array(
			array( 'at' => $at( '2026-10-07 12:00' ), 'currency' => 'TRY', 'amount' => 50.0 ),
		);
		$days = Site_Sales::totals( $paid, $refunds, $today );

		$this->assertCount( Site_Sales::DAYS, $days );
		$this->assertSame( '2026-10-05', $days[0]['day'] );
		$this->assertSame( '2026-10-12', $days[7]['day'] );
		$this->assertSame(
			array(
				'day'      => '2026-10-06',
				'orders'   => 2,
				'revenue'  => array( array( 'currency' => 'TRY', 'cents' => 50050 ) ),
				'refunds'  => 0,
				'refunded' => array(),
			),
			$days[1]
		);
		$this->assertSame(
			array(
				'day'      => '2026-10-07',
				'orders'   => 1,
				'revenue'  => array( array( 'currency' => 'USD', 'cents' => 2000 ) ),
				'refunds'  => 1,
				'refunded' => array( array( 'currency' => 'TRY', 'cents' => 5000 ) ),
			),
			$days[2]
		);
		$this->assertSame( 0, $days[3]['orders'] );
	}

	public function test_without_woocommerce_nothing_is_sent() {
		$this->assertNull( Site_Sales::report() );
	}
}
