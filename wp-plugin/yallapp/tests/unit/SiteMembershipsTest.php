<?php
/**
 * 90.3 Memberships and subscriptions from the website: Paid Memberships Pro, WooCommerce
 * Subscriptions and LearnDash groups.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Lms\Site_Memberships;

class SiteMembershipsTest extends TestCase {

	public function test_a_course_needs_a_membership_only_when_paid_memberships_pro_names_levels() {
		$this->assertNull( Site_Memberships::from_pmpro_access( true ) );
		$this->assertNull( Site_Memberships::from_pmpro_access( array( true, array(), array() ) ) );
		$this->assertSame(
			array(
				'has_access' => false,
				'plans'      => array( 'Gold', 'Annual' ),
			),
			Site_Memberships::from_pmpro_access( array( false, array( '2', '3', '4' ), array( 'Gold', 'Annual', 'Gold', '' ) ) )
		);
		$this->assertTrue( Site_Memberships::from_pmpro_access( array( true, array( 2 ), array( 'Gold' ) ) )['has_access'] );
	}

	public function test_the_course_button_follows_the_membership() {
		$none  = null;
		$lacks = array(
			'has_access' => false,
			'plans'      => array( 'Gold' ),
		);
		$has   = array(
			'has_access' => true,
			'plans'      => array( 'Gold' ),
		);
		// Without a membership rule the button is as before.
		$this->assertSame( 'checkout', Site_Memberships::action( 'checkout', $none, false, true ) );
		// Without the plan: nothing to press, not even a free course's "Enroll".
		$this->assertSame( 'none', Site_Memberships::action( 'enroll_free', $lacks, false, true ) );
		$this->assertSame( 'none', Site_Memberships::action( 'checkout', $lacks, false, true ) );
		// With it: joining in one tap, when the app may enroll.
		$this->assertSame( 'enroll_free', Site_Memberships::action( 'checkout', $has, false, true ) );
		$this->assertSame( 'none', Site_Memberships::action( 'checkout', $has, false, false ) );
		// Enrolled students continue.
		$this->assertSame( 'continue', Site_Memberships::action( 'continue', $lacks, true, true ) );
	}

	public function test_a_paid_memberships_pro_level() {
		$level = (object) array(
			'id'        => 2,
			'name'      => 'Gold',
			'startdate' => 1767225600,
			'enddate'   => '0',
		);
		$this->assertSame(
			array(
				'id'           => 'pmpro-2',
				'source'       => 'paid_memberships_pro',
				'name'         => 'Gold',
				'status'       => 'active',
				'started_at'   => '2026-01-01T00:00:00Z',
				'ends_at'      => null,
				'renews_at'    => '2026-11-01T00:00:00Z',
				'course_count' => null,
			),
			Site_Memberships::pmpro_item( $level, 1793491200 )
		);
		$level->enddate = 1798761600;
		$this->assertSame( '2027-01-01T00:00:00Z', Site_Memberships::pmpro_item( $level, null )['ends_at'] );
	}

	public function test_a_woocommerce_subscription_while_it_gives_access() {
		$data = array(
			'id'           => 81,
			'status'       => 'active',
			'names'        => array( 'Academy monthly', 'Academy monthly', '' ),
			'start'        => '2026-09-01 10:00:00',
			'end'          => '0',
			'next_payment' => '2026-11-01 10:00:00',
		);
		$this->assertSame(
			array(
				'id'           => 'wcs-81',
				'source'       => 'woocommerce_subscriptions',
				'name'         => 'Academy monthly',
				'status'       => 'active',
				'started_at'   => '2026-09-01T10:00:00Z',
				'ends_at'      => null,
				'renews_at'    => '2026-11-01T10:00:00Z',
				'course_count' => null,
			),
			Site_Memberships::wcs_item( $data )
		);
		// Cancelled, running until the end of the paid month: no renewal.
		$cancelled = Site_Memberships::wcs_item(
			array_merge(
				$data,
				array(
					'status' => 'pending-cancel',
					'end'    => '2026-11-01 10:00:00',
				)
			)
		);
		$this->assertSame( 'pending_cancel', $cancelled['status'] );
		$this->assertSame( '2026-11-01T10:00:00Z', $cancelled['ends_at'] );
		$this->assertNull( $cancelled['renews_at'] );
		$this->assertSame( 'on_hold', Site_Memberships::wcs_item( array_merge( $data, array( 'status' => 'on-hold' ) ) )['status'] );
		foreach ( array( 'cancelled', 'expired', 'pending', 'switched', '' ) as $status ) {
			$this->assertNull( Site_Memberships::wcs_item( array_merge( $data, array( 'status' => $status ) ) ), $status );
		}
	}

	public function test_a_learndash_group() {
		$this->assertSame(
			array(
				'id'           => 'ld-group-40',
				'source'       => 'learndash_group',
				'name'         => 'Class of 2026',
				'status'       => 'active',
				'started_at'   => null,
				'ends_at'      => null,
				'renews_at'    => null,
				'course_count' => 3,
			),
			Site_Memberships::group_item( 40, 'Class of 2026', 3 )
		);
		$this->assertNull( Site_Memberships::group_item( 40, 'Class of 2026', null )['course_count'] );
	}

	public function test_dates() {
		$this->assertNull( Site_Memberships::from_unix( 0 ) );
		$this->assertNull( Site_Memberships::from_unix( '' ) );
		$this->assertNull( Site_Memberships::from_unix( null ) );
		$this->assertNull( Site_Memberships::from_gmt( '0000-00-00 00:00:00' ) );
		$this->assertNull( Site_Memberships::from_gmt( 0 ) );
		$this->assertNull( Site_Memberships::from_gmt( 'not a date' ) );
		$this->assertSame( '2026-10-26T08:00:00Z', Site_Memberships::from_gmt( '2026-10-26 08:00:00' ) );
	}

	public function test_none_of_the_plugins_means_no_memberships() {
		$this->assertFalse( Site_Memberships::available() );
		$this->assertNull( Site_Memberships::course( 10, 1 ) );
		$this->assertSame( array(), Site_Memberships::subscriptions( 1 ) );
		$this->assertSame( array(), Site_Memberships::subscriptions( 0 ) );
	}
}
