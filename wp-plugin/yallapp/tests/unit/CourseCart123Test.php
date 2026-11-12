<?php
/**
 * 123 Several courses in one checkout, with a saved card.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Commerce\Saved_Cards;
use Yallapp\Lms\Course_Cart;

class CourseCart123Test extends TestCase {

	public function test_takes_each_course_once_and_at_most_twenty() {
		$this->assertSame( array( 3, 5 ), Course_Cart::ids( array( 3, '5', 3 ) ) );
		$this->assertInstanceOf( WP_Error::class, Course_Cart::ids( array() ) );
		$this->assertInstanceOf( WP_Error::class, Course_Cart::ids( array( 'x' ) ) );
		$this->assertInstanceOf( WP_Error::class, Course_Cart::ids( array( -1 ) ) );
		$this->assertInstanceOf( WP_Error::class, Course_Cart::ids( range( 1, 21 ) ) );
		$this->assertCount( 20, Course_Cart::ids( range( 1, 20 ) ) );
	}

	public function test_totals_leave_out_what_cannot_be_bought_and_take_the_coupon_off() {
		$money = static function ( $amount ) {
			return 'EGP ' . number_format( $amount, 2 );
		};
		$rows  = array(
			array(
				'course_id'  => 1,
				'title'      => 'UI design',
				'image_url'  => null,
				'product_id' => 11,
				'amount'     => 390.0,
				'available'  => true,
				'problem'    => null,
			),
			array(
				'course_id'  => 2,
				'title'      => 'Marketing',
				'image_url'  => 'https://academy.test/m.jpg',
				'product_id' => 12,
				'amount'     => 450.0,
				'available'  => true,
				'problem'    => null,
			),
			array(
				'course_id'  => 3,
				'title'      => 'Python',
				'image_url'  => null,
				'product_id' => 13,
				'amount'     => 500.0,
				'available'  => false,
				'problem'    => 'You already have this course.',
			),
		);
		$cart  = Course_Cart::shape(
			$rows,
			array(
				'json'     => array(
					'code'    => 'noor20',
					'status'  => 'applied',
					'message' => null,
					'label'   => '20%',
				),
				'discount' => 168.0,
			),
			'EGP',
			$money
		);
		$this->assertSame( 'EGP 840.00', $cart['subtotal'] );
		$this->assertSame( 'EGP 168.00', $cart['discount'] );
		$this->assertSame( 'EGP 672.00', $cart['total'] );
		$this->assertFalse( $cart['lines'][2]['available'] );
		$this->assertSame( 'You already have this course.', $cart['lines'][2]['problem'] );
		$this->assertSame( '20%', $cart['coupon']['label'] );

		$plain = Course_Cart::shape( $rows, null, 'EGP', $money );
		$this->assertNull( $plain['discount'] );
		$this->assertNull( $plain['coupon'] );
		$this->assertSame( 'EGP 840.00', $plain['total'] );
	}

	public function test_a_saved_card_shows_its_brand_last_digits_and_expiry_only() {
		$token = new class() {
			public function get_id() {
				return 7;
			}
			public function get_card_type() {
				return 'Visa';
			}
			public function get_last4() {
				return '4821';
			}
			public function get_expiry_month() {
				return '08';
			}
			public function get_expiry_year() {
				return '2028';
			}
			public function is_default() {
				return true;
			}
		};
		$this->assertSame(
			array(
				'id'        => '7',
				'brand'     => 'visa',
				'last4'     => '4821',
				'exp_month' => 8,
				'exp_year'  => 2028,
				'default'   => true,
			),
			Saved_Cards::shape( $token )
		);
		$this->assertSame( array(), Saved_Cards::of( 0 ) );
		$this->assertNull( Saved_Cards::find( 3, 'x' ) );
	}
}
