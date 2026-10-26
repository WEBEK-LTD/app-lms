<?php
/**
 * A WooCommerce coupon in the app's cart.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

/**
 * 91.1 What a WooCommerce coupon takes off the app's cart, so the cart shows the real total
 * before the checkout. Coupons for the whole cart (a percentage, a fixed amount off the cart
 * or off each product) with WooCommerce's dates, usage limits and minimum and maximum spend
 * are worked out here; a coupon with product, category, email or per-customer rules is left
 * to WooCommerce's checkout (`at_checkout`), which applies every coupon in the end.
 *
 * Pure but for `check()`, which reads the coupon.
 */
class Coupon_Quote {

	/**
	 * The coupon of a cart: its status, message and discount.
	 *
	 * @param string $code     The code the customer typed.
	 * @param float  $subtotal The cart's subtotal.
	 * @param int    $quantity Items in the cart.
	 * @return array{json: array, discount: float}
	 */
	public static function check( $code, $subtotal, $quantity ) {
		$code = wc_format_coupon_code( (string) $code );
		$id   = $code ? wc_get_coupon_id_by_code( $code ) : 0;
		if ( ! $id ) {
			return self::result( $code, 'invalid', __( 'This coupon doesn\'t exist.', 'yallapp' ) );
		}
		$coupon  = new \WC_Coupon( $id );
		$expires = $coupon->get_date_expires();
		return self::evaluate(
			$code,
			array(
				'status'      => get_post_status( $id ),
				'type'        => $coupon->get_discount_type(),
				'amount'      => (float) $coupon->get_amount(),
				'expires'     => $expires ? $expires->getTimestamp() : null,
				'usage_limit' => (int) $coupon->get_usage_limit(),
				'usage_count' => (int) $coupon->get_usage_count(),
				'minimum'     => (float) $coupon->get_minimum_amount(),
				'maximum'     => (float) $coupon->get_maximum_amount(),
				'restricted'  => $coupon->get_product_ids() || $coupon->get_excluded_product_ids() || $coupon->get_product_categories() || $coupon->get_excluded_product_categories() || $coupon->get_email_restrictions() || $coupon->get_usage_limit_per_user() || $coupon->get_exclude_sale_items() || $coupon->get_limit_usage_to_x_items(),
				'money'       => static function ( $amount ) {
					return Money::plain( wc_price( $amount ) );
				},
			),
			(float) $subtotal,
			(int) $quantity,
			time()
		);
	}

	/**
	 * The coupon against the cart.
	 *
	 * @param string $code     Code.
	 * @param array  $coupon   status, type, amount, expires (Unix time or null), usage_limit,
	 *                         usage_count, minimum, maximum, restricted, money (formats an amount).
	 * @param float  $subtotal Subtotal.
	 * @param int    $quantity Items.
	 * @param int    $now      Unix time.
	 * @return array{json: array, discount: float}
	 */
	public static function evaluate( $code, array $coupon, $subtotal, $quantity, $now ) {
		if ( 'publish' !== $coupon['status'] ) {
			return self::result( $code, 'invalid', __( 'This coupon doesn\'t exist.', 'yallapp' ) );
		}
		if ( $coupon['expires'] && $coupon['expires'] <= $now ) {
			return self::result( $code, 'invalid', __( 'This coupon has expired.', 'yallapp' ) );
		}
		if ( $coupon['usage_limit'] > 0 && $coupon['usage_count'] >= $coupon['usage_limit'] ) {
			return self::result( $code, 'invalid', __( 'This coupon has been used up.', 'yallapp' ) );
		}
		if ( $coupon['minimum'] > 0 && $subtotal < $coupon['minimum'] ) {
			/* translators: %s: the minimum order amount. */
			return self::result( $code, 'invalid', sprintf( __( 'This coupon is for orders of %s or more.', 'yallapp' ), call_user_func( $coupon['money'], $coupon['minimum'] ) ) );
		}
		if ( $coupon['maximum'] > 0 && $subtotal > $coupon['maximum'] ) {
			/* translators: %s: the maximum order amount. */
			return self::result( $code, 'invalid', sprintf( __( 'This coupon is for orders up to %s.', 'yallapp' ), call_user_func( $coupon['money'], $coupon['maximum'] ) ) );
		}
		$discount = self::discount( (string) $coupon['type'], (float) $coupon['amount'], $subtotal, $quantity );
		if ( $coupon['restricted'] || null === $discount ) {
			return self::result( $code, 'at_checkout', __( 'This coupon is checked at checkout.', 'yallapp' ) );
		}
		return array(
			'json'     => array(
				'code'    => $code,
				'status'  => 'applied',
				'message' => null,
			),
			'discount' => $discount,
		);
	}

	/**
	 * What a coupon type takes off the whole cart; null for types only the checkout knows.
	 *
	 * @param string $type     percent, fixed_cart or fixed_product.
	 * @param float  $amount   The coupon's amount.
	 * @param float  $subtotal Subtotal.
	 * @param int    $quantity Items.
	 * @return float|null
	 */
	public static function discount( $type, $amount, $subtotal, $quantity ) {
		switch ( $type ) {
			case 'percent':
				$off = $subtotal * min( 100, max( 0, $amount ) ) / 100;
				break;
			case 'fixed_cart':
				$off = $amount;
				break;
			case 'fixed_product':
				$off = $amount * max( 0, $quantity );
				break;
			default:
				return null;
		}
		return round( max( 0.0, min( $off, $subtotal ) ), 2 );
	}

	/**
	 * A result without a discount.
	 *
	 * @param string $code    Code.
	 * @param string $status  invalid or at_checkout.
	 * @param string $message For the customer.
	 * @return array{json: array, discount: float}
	 */
	private static function result( $code, $status, $message ) {
		return array(
			'json'     => array(
				'code'    => (string) $code,
				'status'  => $status,
				'message' => $message,
			),
			'discount' => 0.0,
		);
	}
}
