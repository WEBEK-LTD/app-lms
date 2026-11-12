<?php
/**
 * Several courses in one checkout.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use Yallapp\Commerce\Money;
use Yallapp\Store\Coupon_Quote;

/**
 * 123 The app's course cart (`POST /courses/cart`, `/courses/cart/checkout-link`): the courses
 * the student chose, priced as WooCommerce sells them now, with a coupon of the site's, then
 * one checkout for all of them. Only on sites whose LMS sells its courses with WooCommerce.
 */
class Course_Cart {

	const MAX_COURSES = 20;

	/**
	 * Whether the site can sell several courses in one checkout.
	 *
	 * @param mixed $lms The site's LMS adapter, or null.
	 * @return bool
	 */
	public static function available( $lms ) {
		return $lms instanceof Woo_Course_Products && $lms->sells_with_woocommerce() && function_exists( 'WC' );
	}

	/**
	 * The course IDs of a request: whole numbers, each once, at most twenty.
	 *
	 * @param mixed $ids `course_ids`.
	 * @return int[]|WP_Error
	 */
	public static function ids( $ids ) {
		if ( ! is_array( $ids ) || ! $ids ) {
			return new WP_Error( 'invalid_request', __( 'Choose at least one course.', 'yallapp' ), array( 'status' => 400 ) );
		}
		$out = array();
		foreach ( $ids as $id ) {
			if ( ! is_numeric( $id ) || (int) $id <= 0 ) {
				return new WP_Error( 'invalid_request', __( 'Choose at least one course.', 'yallapp' ), array( 'status' => 400 ) );
			}
			$out[ (int) $id ] = (int) $id;
		}
		if ( count( $out ) > self::MAX_COURSES ) {
			return new WP_Error( 'invalid_request', __( 'A cart holds up to 20 courses.', 'yallapp' ), array( 'status' => 400 ) );
		}
		return array_values( $out );
	}

	/**
	 * Each course of the cart as the site sells it now.
	 *
	 * @param Lms_Adapter $lms        The LMS (a Woo_Course_Products).
	 * @param int[]       $course_ids Courses.
	 * @param int         $user_id    Student.
	 * @return array[] {course_id, title, image_url, product_id, amount, available, problem}
	 */
	public static function rows( $lms, array $course_ids, $user_id ) {
		$rows = array();
		foreach ( $course_ids as $course_id ) {
			$course  = $lms->course( $course_id, $user_id );
			$product = $course && $lms instanceof Woo_Course_Products ? wc_get_product( $lms->course_product_id( $course_id ) ) : null;
			$row     = array(
				'course_id'  => (int) $course_id,
				'title'      => $course ? (string) $course['title'] : __( 'Unavailable course', 'yallapp' ),
				'image_url'  => $course ? ( $course['image_url'] ?? null ) : null,
				'product_id' => $product ? (int) $product->get_id() : 0,
				'amount'     => $product ? (float) wc_get_price_to_display( $product ) : 0.0,
				'available'  => false,
				'problem'    => __( 'This course is not sold any more.', 'yallapp' ),
			);
			if ( $course && ! empty( $course['enrolled'] ) ) {
				$row['problem'] = __( 'You already have this course.', 'yallapp' );
			} elseif ( $course && ! empty( $course['price']['is_free'] ) ) {
				$row['problem'] = __( 'This course is free: join it from its page.', 'yallapp' );
			} elseif ( $product && $product->is_purchasable() && $product->is_in_stock() ) {
				$row['available'] = true;
				$row['problem']   = null;
			}
			$rows[] = $row;
		}
		return $rows;
	}

	/**
	 * Prices the cart.
	 *
	 * @param Lms_Adapter $lms        The LMS.
	 * @param int[]       $course_ids Courses.
	 * @param int         $user_id    Student.
	 * @param string|null $coupon     The coupon the student typed.
	 * @return array CourseCart shape.
	 */
	public static function quote( $lms, array $course_ids, $user_id, $coupon ) {
		$rows    = self::rows( $lms, $course_ids, $user_id );
		$checked = null;
		if ( null !== $coupon && '' !== trim( (string) $coupon ) ) {
			$subtotal = array_sum( array_column( array_filter( $rows, static fn( $r ) => $r['available'] ), 'amount' ) );
			$count    = count( array_filter( $rows, static fn( $r ) => $r['available'] ) );
			$checked  = Coupon_Quote::check( $coupon, $subtotal, $count );
			if ( 'applied' === ( $checked['json']['status'] ?? '' ) ) {
				$checked['json']['label'] = self::label( (string) $checked['json']['code'], (float) $checked['discount'] );
			}
		}
		return self::shape(
			$rows,
			$checked,
			(string) get_woocommerce_currency(),
			static function ( $amount ) {
				return Money::plain( wc_price( $amount ) );
			}
		);
	}

	/**
	 * The cart from its rows and coupon. Pure.
	 *
	 * @param array[]    $rows     From rows().
	 * @param array|null $coupon   Coupon_Quote's result: json, discount.
	 * @param string     $currency ISO code.
	 * @param callable   $money    Formats an amount.
	 * @return array CourseCart shape.
	 */
	public static function shape( array $rows, $coupon, $currency, callable $money ) {
		$subtotal = 0.0;
		$lines    = array();
		foreach ( $rows as $row ) {
			if ( $row['available'] ) {
				$subtotal += (float) $row['amount'];
			}
			$lines[] = array(
				'course_id' => (int) $row['course_id'],
				'title'     => (string) $row['title'],
				'image_url' => $row['image_url'],
				'price'     => $money( (float) $row['amount'] ),
				'available' => (bool) $row['available'],
				'problem'   => $row['problem'],
			);
		}
		$off = $coupon ? min( $subtotal, (float) $coupon['discount'] ) : 0.0;
		return array(
			'lines'    => $lines,
			'subtotal' => $money( $subtotal ),
			'discount' => $off > 0 ? $money( $off ) : null,
			'total'    => $money( max( 0.0, $subtotal - $off ) ),
			'currency' => $currency,
			'coupon'   => $coupon ? $coupon['json'] : null,
		);
	}

	/**
	 * What an applied coupon takes off, as the cart shows it: `20%`, or the amount.
	 *
	 * @param string $code     Coupon code.
	 * @param float  $discount Its discount on this cart.
	 * @return string
	 */
	private static function label( $code, $discount ) {
		$coupon = new \WC_Coupon( $code );
		if ( 'percent' === $coupon->get_discount_type() ) {
			return wc_format_decimal( (float) $coupon->get_amount(), false, true ) . '%';
		}
		return Money::plain( wc_price( $discount ) );
	}
}
