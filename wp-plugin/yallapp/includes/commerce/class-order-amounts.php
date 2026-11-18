<?php
/**
 * 173 What a WooCommerce order's total is made of, in the app's `Order.amounts`.
 *
 * @package Yallapp
 */

namespace Yallapp\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * The subtotal, the coupons' discount, the shipping, the delivery time's fee,
 * the other fee lines, the taxes and the total, as the shop displays prices
 * (with or without tax), so the lines the app draws add up to the total.
 */
class Order_Amounts {

	/**
	 * `Order.amounts` from a WooCommerce order.
	 *
	 * @param \WC_Order $order Order.
	 * @return array
	 */
	public static function of_order( $order ) {
		$fees = array();
		foreach ( $order->get_fees() as $fee ) {
			$fees[] = array(
				'name'  => (string) $fee->get_name(),
				'total' => (float) $fee->get_total(),
				'tax'   => (float) $fee->get_total_tax(),
			);
		}
		$subtotal_tax = 0.0;
		foreach ( $order->get_items() as $item ) {
			if ( $item instanceof \WC_Order_Item_Product ) {
				$subtotal_tax += (float) $item->get_subtotal_tax();
			}
		}
		$tax_labels = array();
		foreach ( $order->get_tax_totals() as $tax ) {
			$tax_labels[] = (string) $tax->label;
		}
		$currency = (string) $order->get_currency();
		return self::amounts(
			array(
				'incl'         => 'incl' === get_option( 'woocommerce_tax_display_cart' ),
				'subtotal'     => (float) $order->get_subtotal(),
				'subtotal_tax' => $subtotal_tax,
				'discount'     => (float) $order->get_discount_total(),
				'discount_tax' => (float) $order->get_discount_tax(),
				'coupons'      => array_map( 'strval', (array) $order->get_coupon_codes() ),
				'shipping'     => (float) $order->get_shipping_total(),
				'shipping_tax' => (float) $order->get_shipping_tax(),
				'zone'         => (string) $order->get_shipping_method(),
				'fees'         => $fees,
				'slot_label'   => (string) $order->get_meta( \Yallapp\Store\Store_Extras::META_SLOT_LABEL ),
				'tax'          => (float) $order->get_total_tax(),
				'tax_label'    => implode( ', ', array_filter( $tax_labels ) ),
				'total'        => (float) $order->get_total(),
			),
			static function ( $amount ) use ( $currency ) {
				return Money::plain( wc_price( $amount, array( 'currency' => $currency ) ) );
			}
		);
	}

	/**
	 * `Order.amounts` from an order's numbers. Pure.
	 *
	 * The delivery time's fee is the fee line the plugin's checkout adds for
	 * the chosen slot ("Delivery time 10:00–13:00"): the one whose name has
	 * the order's slot label in it.
	 *
	 * @param array    $parts  `incl` (prices shown with tax), `subtotal`, `subtotal_tax`,
	 *                         `discount`, `discount_tax`, `coupons`, `shipping`, `shipping_tax`,
	 *                         `zone` (the shipping method), `fees` (each `name`, `total`, `tax`),
	 *                         `slot_label`, `tax`, `tax_label`, `total`.
	 * @param callable $format Formats an amount, like "₺450.00".
	 * @return array
	 */
	public static function amounts( array $parts, callable $format ) {
		$incl  = ! empty( $parts['incl'] );
		$with  = static function ( $amount, $tax ) use ( $incl ) {
			return (float) $amount + ( $incl ? (float) $tax : 0.0 );
		};
		$money = static function ( $amount ) use ( $format ) {
			return (string) call_user_func( $format, round( (float) $amount, 2 ) );
		};

		$discount = $with( $parts['discount'] ?? 0, $parts['discount_tax'] ?? 0 );
		$coupons  = array_values( array_filter( array_map( 'strval', (array) ( $parts['coupons'] ?? array() ) ) ) );
		$shipping = $with( $parts['shipping'] ?? 0, $parts['shipping_tax'] ?? 0 );
		$zone     = trim( (string) ( $parts['zone'] ?? '' ) );
		$slot     = trim( (string) ( $parts['slot_label'] ?? '' ) );

		$slot_fee = null;
		$fees     = array();
		foreach ( (array) ( $parts['fees'] ?? array() ) as $fee ) {
			$name   = trim( (string) ( $fee['name'] ?? '' ) );
			$amount = $with( $fee['total'] ?? 0, $fee['tax'] ?? 0 );
			if ( null === $slot_fee && '' !== $slot && false !== strpos( $name, $slot ) ) {
				$slot_fee = $amount;
				continue;
			}
			if ( 0.0 === round( $amount, 2 ) ) {
				continue;
			}
			$fees[] = array(
				'label'  => $name,
				'amount' => $money( $amount ),
			);
		}

		$tax = (float) ( $parts['tax'] ?? 0 );
		return array(
			'subtotal' => $money( $with( $parts['subtotal'] ?? 0, $parts['subtotal_tax'] ?? 0 ) ),
			'discount' => $discount > 0
				? array(
					'code'   => $coupons ? implode( ', ', $coupons ) : null,
					'amount' => $money( $discount ),
				)
				: null,
			'points'   => null,
			'shipping' => $shipping > 0
				? array(
					'zone'   => '' !== $zone ? $zone : null,
					'amount' => $money( $shipping ),
				)
				: null,
			'slot_fee' => null !== $slot_fee && $slot_fee > 0 ? $money( $slot_fee ) : null,
			'fees'     => $fees,
			'tax'      => $tax > 0
				? array(
					'label'    => '' !== trim( (string) ( $parts['tax_label'] ?? '' ) ) ? trim( (string) $parts['tax_label'] ) : __( 'Tax', 'yallapp' ),
					'included' => $incl,
					'amount'   => $money( $tax ),
				)
				: null,
			'total'    => $money( $parts['total'] ?? 0 ),
		);
	}
}
