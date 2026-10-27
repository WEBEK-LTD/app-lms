<?php
/**
 * 100.4 Courses and memberships bought in the app through Google Play and the App Store:
 * Yallapp's signed "give or take access" request, store product IDs, the license status's
 * products, `Config.store_billing`, the course page's button and the catalog.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Billing\Access_Request;
use Yallapp\Billing\Handled_Grants;
use Yallapp\Billing\Site_Plans;
use Yallapp\Billing\Store_Billing;

class StoreBillingTest extends TestCase {

	const KEY   = 'YALL-7K2D-9QWE-4MNB';
	const NOW   = 1792000000;
	const GRANT = '3f1c2a9e-8d4b-4c6a-9e2f-1b7d5a0c4e88';

	public function test_the_signature_matches_the_platforms() {
		// HMAC-SHA256 of `yallapp-billing-access:1792000000:{"grant_id":"x"}` keyed with the license key, as the platform signs it.
		$this->assertSame( '612840ed391bfe86fe51f3c52acee2a0f1849544691452a57231ea27ec0906c5', Access_Request::sign( self::KEY, self::NOW, '{"grant_id":"x"}' ) );
		$this->assertSame( Access_Request::sign( self::KEY, self::NOW, '{}' ), Access_Request::sign( ' yall-7k2d-9qwe-4mnb ', self::NOW, '{}' ) );
	}

	public function test_a_signed_body_within_five_minutes_is_accepted() {
		$raw       = '{"grant_id":"x"}';
		$signature = Access_Request::sign( self::KEY, self::NOW, $raw );
		$this->assertTrue( Access_Request::verify( self::KEY, (string) self::NOW, $signature, $raw, self::NOW ) );
		$this->assertTrue( Access_Request::verify( self::KEY, (string) self::NOW, $signature, $raw, self::NOW + 300 ) );
		$this->assertTrue( Access_Request::verify( self::KEY, (string) self::NOW, $signature, $raw, self::NOW - 300 ) );
	}

	public function test_wrong_signatures_bodies_keys_and_times_are_refused() {
		$raw       = '{"grant_id":"x"}';
		$signature = Access_Request::sign( self::KEY, self::NOW, $raw );
		$this->assertFalse( Access_Request::verify( self::KEY, (string) self::NOW, $signature, $raw, self::NOW + 301 ) );
		$this->assertFalse( Access_Request::verify( self::KEY, (string) self::NOW, $signature, $raw, self::NOW - 301 ) );
		// The body is signed as received: a space more is another body.
		$this->assertFalse( Access_Request::verify( self::KEY, (string) self::NOW, $signature, '{"grant_id": "x"}', self::NOW ) );
		$this->assertFalse( Access_Request::verify( 'YALL-AAAA-BBBB-CCCC', (string) self::NOW, $signature, $raw, self::NOW ) );
		$this->assertFalse( Access_Request::verify( '', (string) self::NOW, Access_Request::sign( '', self::NOW, $raw ), $raw, self::NOW ) );
		$this->assertFalse( Access_Request::verify( self::KEY, (string) ( self::NOW + 1 ), $signature, $raw, self::NOW ) );
		$this->assertFalse( Access_Request::verify( self::KEY, (string) self::NOW, strtoupper( $signature ), $raw, self::NOW ) );
		$this->assertFalse( Access_Request::verify( self::KEY, (string) self::NOW, null, $raw, self::NOW ) );
		$this->assertFalse( Access_Request::verify( self::KEY, null, $signature, $raw, self::NOW ) );
		$this->assertFalse( Access_Request::verify( self::KEY, self::NOW . '.0', $signature, $raw, self::NOW ) );
		$this->assertFalse( Access_Request::verify( self::KEY, (string) self::NOW, $signature, null, self::NOW ) );
	}

	public function test_a_course_grant_is_read() {
		$change = Access_Request::parse( $this->request() );
		$this->assertSame(
			array(
				'grant_id'       => self::GRANT,
				'action'         => 'grant',
				'user_id'        => 7,
				'kind'           => 'course',
				'course_id'      => 12,
				'plan_id'        => null,
				'expires_at'     => null,
				'platform'       => 'android',
				'transaction_id' => 'GPA.3312-1111-2222-33333',
				'amount'         => '450.00',
				'currency'       => 'TRY',
			),
			$change
		);
	}

	public function test_a_membership_grant_is_read_with_its_end() {
		$change = Access_Request::parse(
			$this->request(
				array(
					'kind'       => 'membership',
					'course_id'  => null,
					'plan_id'    => 'pmpro:3',
					'expires_at' => '2026-11-27T10:00:00Z',
					'platform'   => 'ios',
					'amount'     => null,
					'currency'   => null,
				)
			)
		);
		$this->assertSame( 'pmpro:3', $change['plan_id'] );
		$this->assertNull( $change['course_id'] );
		$this->assertSame( gmmktime( 10, 0, 0, 11, 27, 2026 ), $change['expires_at'] );
		$this->assertNull( $change['amount'] );
		$this->assertNull( $change['currency'] );
	}

	public function test_wrong_requests_are_refused() {
		$this->assertNull( Access_Request::parse( null ) );
		$this->assertNull( Access_Request::parse( $this->request( array( 'grant_id' => 'x' ) ) ) );
		$this->assertNull( Access_Request::parse( $this->request( array( 'action' => 'give' ) ) ) );
		$this->assertNull( Access_Request::parse( $this->request( array( 'user_id' => 0 ) ) ) );
		$this->assertNull( Access_Request::parse( $this->request( array( 'user_id' => '7' ) ) ) );
		$this->assertNull( Access_Request::parse( $this->request( array( 'platform' => 'web' ) ) ) );
		$this->assertNull( Access_Request::parse( $this->request( array( 'transaction_id' => '' ) ) ) );
		$this->assertNull( Access_Request::parse( $this->request( array( 'course_id' => null ) ) ) );
		$this->assertNull(
			Access_Request::parse(
				$this->request(
					array(
						'kind'    => 'membership',
						'plan_id' => 'gold',
					)
				)
			)
		);
		$this->assertNull(
			Access_Request::parse(
				$this->request(
					array(
						'kind'       => 'membership',
						'plan_id'    => 'wcs:45',
						'expires_at' => 'soon',
					)
				)
			)
		);
	}

	public function test_product_ids_match_the_platforms() {
		// platform/web/src/lib/store-billing/products.ts, productIdFor().
		$this->assertSame( 'course_123', Store_Billing::product_id( 'course', 123 ) );
		$this->assertSame( 'plan_pmpro_3', Store_Billing::product_id( 'membership', 'pmpro:3' ) );
		$this->assertSame( 'plan_ld_group_12', Store_Billing::product_id( 'membership', 'ld_group:12' ) );
		$this->assertSame( 'plan_wcs_45', Store_Billing::product_id( 'membership', 'WCS:45' ) );
		$this->assertSame( 'plan_gold_annual', Store_Billing::product_id( 'membership', '--Gold  Annual!!' ) );
		$this->assertSame( 40, strlen( Store_Billing::product_id( 'membership', str_repeat( 'a', 60 ) ) ) );
	}

	public function test_plan_ids_name_their_source() {
		$this->assertSame(
			array(
				'source' => 'pmpro',
				'id'     => 3,
			),
			Store_Billing::plan_source( 'pmpro:3' )
		);
		$this->assertSame( 'ld_group', Store_Billing::plan_source( 'ld_group:12' )['source'] );
		$this->assertSame( 45, Store_Billing::plan_source( 'wcs:45' )['id'] );
		$this->assertNull( Store_Billing::plan_source( 'pmpro:0' ) );
		$this->assertNull( Store_Billing::plan_source( 'stripe:3' ) );
		$this->assertNull( Store_Billing::plan_source( 'pmpro:3 ' ) );
	}

	public function test_the_license_status_keeps_well_formed_products_only() {
		$this->assertNull( Store_Billing::of_status( array() ) );
		$this->assertNull( Store_Billing::of_status( array( 'store_billing' => null ) ) );
		$this->assertNull( Store_Billing::of_status( array( 'store_billing' => array( 'base_url' => 'ftp://x' ) ) ) );
		$billing = Store_Billing::of_status( array( 'store_billing' => $this->status_billing() ) );
		$this->assertSame( 'https://yallapp.com.tr/api/app/1', $billing['base_url'] );
		$this->assertSame( array( 'android', 'ios' ), $billing['platforms'] );
		$this->assertSame(
			array(
				array(
					'product_id' => 'course_12',
					'kind'       => 'course',
					'course_id'  => 12,
					'plan_id'    => null,
				),
				array(
					'product_id' => 'plan_pmpro_3',
					'kind'       => 'membership',
					'course_id'  => null,
					'plan_id'    => 'pmpro:3',
				),
			),
			$billing['products']
		);
	}

	public function test_config_is_sent_only_on_the_platforms_that_sell() {
		$billing = Store_Billing::of_status(
			array(
				'store_billing' => array_merge(
					$this->status_billing(),
					array( 'platforms' => array( 'android' ) )
				),
			)
		);
		$this->assertSame(
			array(
				'base_url' => 'https://yallapp.com.tr/api/app/1',
				'session'  => 'site',
			),
			Store_Billing::config( $billing, 'android' )
		);
		$this->assertNull( Store_Billing::config( $billing, 'ios' ) );
		$this->assertNull( Store_Billing::config( null, 'android' ) );
	}

	public function test_course_and_plan_products() {
		$billing = Store_Billing::of_status( array( 'store_billing' => $this->status_billing() ) );
		$this->assertSame( 'course_12', Store_Billing::course_product( $billing, 12 ) );
		$this->assertNull( Store_Billing::course_product( $billing, 13 ) );
		$this->assertNull( Store_Billing::course_product( null, 12 ) );
		$this->assertSame( array( 'plan_pmpro_3' ), Store_Billing::plan_products( $billing, array( 'pmpro:2', 'pmpro:3' ) ) );
		$this->assertSame( array(), Store_Billing::plan_products( $billing, array() ) );
		$this->assertSame( array( 'pmpro:2', 'pmpro:3' ), Site_Plans::pmpro_plan_ids( array( false, array( '2', '3', '2' ), array( 'Gold', 'Annual', 'Gold' ) ) ) );
		$this->assertSame( array(), Site_Plans::pmpro_plan_ids( true ) );
	}

	public function test_the_course_button_buys_through_the_store() {
		// A paid course the student isn't in: the store when its product is ready, else nothing.
		$this->assertSame( 'store', Store_Billing::course_action( 'checkout', true, false, true, 'course_12' ) );
		$this->assertSame( 'store', Store_Billing::course_action( 'none', true, false, true, 'course_12' ) );
		$this->assertSame( 'none', Store_Billing::course_action( 'checkout', true, false, true, null ) );
		// Enrolled, free, or no selling in the app on this platform: as before.
		$this->assertSame( 'continue', Store_Billing::course_action( 'continue', true, true, true, 'course_12' ) );
		$this->assertSame( 'enroll_free', Store_Billing::course_action( 'enroll_free', false, false, true, null ) );
		$this->assertSame( 'checkout', Store_Billing::course_action( 'checkout', true, false, false, 'course_12' ) );
	}

	public function test_prices_and_periods() {
		$this->assertSame( '450.00', Store_Billing::price_text( '450' ) );
		$this->assertSame( '199.90', Store_Billing::price_text( 199.9 ) );
		$this->assertSame( '12.35', Store_Billing::price_text( '12.345' ) );
		$this->assertNull( Store_Billing::price_text( '0' ) );
		$this->assertNull( Store_Billing::price_text( '1,200.00' ) );
		$this->assertNull( Store_Billing::price_text( '10000000' ) );
		$this->assertNull( Store_Billing::price_text( null ) );
		$this->assertSame( 'month', Store_Billing::period( '1', 'Month' ) );
		$this->assertSame( 'year', Store_Billing::period( 1, 'Y' ) );
		$this->assertSame( 'year', Store_Billing::period( 12, 'month' ) );
		$this->assertNull( Store_Billing::period( 3, 'Month' ) );
		$this->assertNull( Store_Billing::period( 1, 'Week' ) );
	}

	public function test_the_catalog_keeps_what_yallapp_accepts() {
		$catalog = Store_Billing::catalog(
			'try',
			array(
				array(
					'id'    => 12,
					'title' => ' Python &amp; <b>Data</b> ',
					'price' => '450',
				),
				array(
					'id'    => 12,
					'title' => 'Again',
					'price' => '1.00',
				),
				array(
					'id'    => 13,
					'title' => 'No price',
					'price' => null,
				),
				array(
					'id'    => 14,
					'title' => '',
					'price' => '5',
				),
			),
			array(
				array(
					'id'         => 'pmpro:3',
					'title'      => 'Gold',
					'price'      => '199',
					'period'     => 'month',
					'course_ids' => array( 12, '13', 0, 12 ),
				),
				array(
					'id'     => 'gold',
					'title'  => 'Not a plan ID',
					'price'  => '1',
					'period' => 'month',
				),
				array(
					'id'     => 'wcs:45',
					'title'  => 'Weekly',
					'price'  => '1',
					'period' => 'week',
				),
			)
		);
		$this->assertSame(
			array(
				'currency' => 'TRY',
				'courses'  => array(
					array(
						'id'    => 12,
						'title' => 'Python & Data',
						'price' => '450.00',
					),
				),
				'plans'    => array(
					array(
						'id'         => 'pmpro:3',
						'title'      => 'Gold',
						'price'      => '199.00',
						'period'     => 'month',
						'course_ids' => array( 12, 13 ),
					),
				),
			),
			$catalog
		);
		$this->assertNull( Store_Billing::catalog( '', array(), array() ) );
	}

	public function test_a_repeated_grant_answers_as_the_first_time() {
		$list = Handled_Grants::remember( array(), self::GRANT, 512, self::NOW );
		$this->assertSame(
			array(
				'ok'       => true,
				'order_id' => 512,
			),
			Handled_Grants::find( $list, strtoupper( self::GRANT ) )
		);
		$this->assertNull( Handled_Grants::find( $list, '00000000-0000-0000-0000-000000000000' ) );
		$list = Handled_Grants::remember( $list, 'b0000000-0000-0000-0000-000000000000', null, self::NOW );
		$this->assertSame(
			array(
				'ok'       => true,
				'order_id' => null,
			),
			Handled_Grants::find( $list, 'b0000000-0000-0000-0000-000000000000' )
		);
		// Kept for 60 days.
		$later = Handled_Grants::remember( $list, 'c0000000-0000-0000-0000-000000000000', null, self::NOW + Handled_Grants::KEEP + 1 );
		$this->assertNull( Handled_Grants::find( $later, self::GRANT ) );
		$this->assertNotNull( Handled_Grants::find( $later, 'c0000000-0000-0000-0000-000000000000' ) );
	}

	public function test_at_most_so_many_grants_are_kept() {
		$list = array();
		for ( $i = 0; $i <= Handled_Grants::MAX; $i++ ) {
			$list[ sprintf( '%08d-0000-0000-0000-000000000000', $i ) ] = array(
				'at'       => self::NOW,
				'order_id' => null,
			);
		}
		$list = Handled_Grants::remember( $list, self::GRANT, null, self::NOW );
		$this->assertCount( Handled_Grants::MAX, $list );
		$this->assertNull( Handled_Grants::find( $list, '00000000-0000-0000-0000-000000000000' ) );
		$this->assertNotNull( Handled_Grants::find( $list, self::GRANT ) );
	}

	/**
	 * A course grant as Yallapp sends it, with some fields changed.
	 *
	 * @param array $changes Fields to change.
	 * @return array
	 */
	private function request( array $changes = array() ) {
		return array_merge(
			array(
				'grant_id'       => self::GRANT,
				'action'         => 'grant',
				'user_id'        => 7,
				'kind'           => 'course',
				'course_id'      => 12,
				'plan_id'        => null,
				'expires_at'     => null,
				'platform'       => 'android',
				'transaction_id' => 'GPA.3312-1111-2222-33333',
				'amount'         => '450.00',
				'currency'       => 'TRY',
			),
			$changes
		);
	}

	/**
	 * `LicenseStatus.store_billing` as the platform sends it, with a product that isn't one.
	 *
	 * @return array
	 */
	private function status_billing() {
		return array(
			'base_url'  => 'https://yallapp.com.tr/api/app/1/',
			'platforms' => array( 'android', 'ios', 'web' ),
			'products'  => array(
				array(
					'product_id' => 'course_12',
					'kind'       => 'course',
					'course_id'  => 12,
					'plan_id'    => null,
				),
				array(
					'product_id' => 'plan_pmpro_3',
					'kind'       => 'membership',
					'course_id'  => null,
					'plan_id'    => 'pmpro:3',
				),
				array(
					'product_id' => 'Course 13',
					'kind'       => 'course',
					'course_id'  => 13,
				),
			),
		);
	}
}
