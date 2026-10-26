<?php
/**
 * 91.3 When a WooCommerce order can be returned from the app, what the app sends, and what the customer reads.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Commerce\Order_Returns;

if ( ! defined( 'DAY_IN_SECONDS' ) ) {
	define( 'DAY_IN_SECONDS', 86400 );
}

if ( ! class_exists( 'WP_Error' ) ) {
	/**
	 * Minimal stand-in for WordPress's error.
	 */
	class WP_Error { // phpcs:ignore Generic.Files.OneObjectStructurePerFile.MultipleFound
		/**
		 * Code.
		 *
		 * @var string
		 */
		public $code;

		/**
		 * Constructor.
		 *
		 * @param string $code Code.
		 */
		public function __construct( $code = '' ) {
			$this->code = $code;
		}
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	/**
	 * Minimal stand-in.
	 *
	 * @param mixed $thing Value.
	 * @return bool
	 */
	function is_wp_error( $thing ) {
		return $thing instanceof WP_Error;
	}
}

class OrderReturnsTest extends TestCase {

	public function test_days_are_off_or_up_to_a_year(): void {
		$this->assertSame( 0, Order_Returns::days( 0 ) );
		$this->assertSame( 0, Order_Returns::days( '' ) );
		$this->assertSame( 0, Order_Returns::days( -3 ) );
		$this->assertSame( 14, Order_Returns::days( '14' ) );
		$this->assertSame( 365, Order_Returns::days( 900 ) );
	}

	public function test_only_a_completed_order_with_something_to_send_back_within_the_days(): void {
		$now  = 1793000000;
		$done = $now - 3 * 86400;
		$this->assertTrue( Order_Returns::allowed( 'completed', true, $done, false, 14, $now ) );
		$this->assertTrue( Order_Returns::allowed( 'completed', true, $now - 14 * 86400, false, 14, $now ) );
		$this->assertFalse( Order_Returns::allowed( 'completed', true, $now - 15 * 86400, false, 14, $now ), 'too late' );
		$this->assertFalse( Order_Returns::allowed( 'processing', true, $done, false, 14, $now ), 'not completed' );
		$this->assertFalse( Order_Returns::allowed( 'completed', false, $done, false, 14, $now ), 'only downloads' );
		$this->assertFalse( Order_Returns::allowed( 'completed', true, $done, true, 14, $now ), 'asked already' );
		$this->assertFalse( Order_Returns::allowed( 'completed', true, $done, false, 0, $now ), 'the shop takes no returns' );
		$this->assertFalse( Order_Returns::allowed( 'completed', true, null, false, 14, $now ), 'no completion date' );
	}

	public function test_the_request_needs_a_known_reason_and_a_note_with_other(): void {
		$this->assertSame(
			array(
				'reason' => 'damaged',
				'note'   => null,
			),
			Order_Returns::parse( 'damaged', '  ' )
		);
		$this->assertSame(
			array(
				'reason' => 'other',
				'note'   => 'Too small for me',
			),
			Order_Returns::parse( 'other', "  Too   small for me\t" )
		);
		$this->assertTrue( is_wp_error( Order_Returns::parse( 'broken', null ) ) );
		$this->assertTrue( is_wp_error( Order_Returns::parse( null, null ) ) );
		$this->assertTrue( is_wp_error( Order_Returns::parse( 'other', '' ) ) );
		$this->assertTrue( is_wp_error( Order_Returns::parse( 'wrong_item', str_repeat( 'a', 501 ) ) ) );
	}

	public function test_what_the_customer_reads(): void {
		$this->assertSame(
			array(
				'title' => 'Order #1042',
				'body'  => 'Your return was approved. Our courier picks it up on Monday.',
			),
			Order_Returns::decision_text( '1042', 'approved', ' Our courier picks it up on Monday. ' )
		);
		$this->assertSame( 'Your return was declined.', Order_Returns::decision_text( '1042', 'declined', '' )['body'] );
	}
}
