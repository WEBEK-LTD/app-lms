<?php
/**
 * Orders paid inside the app, priced and created in WooCommerce.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

use WC_Order;
use WP_Error;

/**
 * 134 An order paid inside the app through the owner's own gateway in Yallapp (Demo). Yallapp
 * asks for its price right before the payment (`quote`: the cart as WooCommerce's checkout
 * prices it for the customer's address, its shipping, fees and taxes, and its stock), then, once
 * the payment is verified, for the order (`create`): made by WooCommerce's own checkout from that
 * cart, with the gift's sender as billing and its recipient as shipping, the delivery details as
 * order meta, the payment method "<gateway> (in app)", and marked paid with
 * `payment_complete()`, so stock goes down and WooCommerce's emails go out as usual. One order per
 * payment reference, whatever the number of tries.
 */
class Paid_Orders {

	const META_REFERENCE   = '_yallapp_payment_ref';
	const META_TRANSACTION = '_yallapp_payment_transaction';
	const META_GATEWAY     = '_yallapp_paid_in_app';
	const METHOD           = 'yallapp_in_app';
	/**
	 * Seconds one creation keeps others of the same reference waiting.
	 */
	const LOCK_SECONDS = 60;

	/**
	 * The order already made for a payment reference, or null.
	 *
	 * @param string $reference Yallapp's payment reference.
	 * @return WC_Order|null
	 */
	public static function find( $reference ) {
		$orders = wc_get_orders(
			array(
				'limit'      => 1,
				'status'     => 'any',
				'meta_key'   => self::META_REFERENCE, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- One payment's order.
				'meta_value' => (string) $reference, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- One payment's order.
			)
		);
		$order  = is_array( $orders ) ? reset( $orders ) : null;
		return $order instanceof WC_Order ? $order : null;
	}

	/**
	 * `quote` or `create`.
	 *
	 * @param array $request The checked request (Paid_Order_Request::parse()).
	 * @return array|WP_Error
	 */
	public function handle( array $request ) {
		if ( ! function_exists( 'wc_load_cart' ) || ! function_exists( 'WC' ) ) {
			return new WP_Error( 'store_unavailable', __( 'The shop is not available right now.', 'yallapp' ), array( 'status' => 503 ) );
		}
		if ( get_woocommerce_currency() !== $request['currency'] ) {
			return new WP_Error( 'currency_changed', __( 'The shop\'s currency changed.', 'yallapp' ), array( 'status' => 409 ) );
		}
		if ( 'quote' === $request['action'] ) {
			$built = $this->build( $request );
			$this->clear();
			return is_wp_error( $built ) ? $built : $built['quote'];
		}
		$existing = self::find( $request['reference'] );
		if ( $existing ) {
			return self::answer( $existing, false );
		}
		// Yallapp claims each payment once, and the reference keeps one order; the lock covers a retry that crosses the first.
		$lock = 'yallapp_paid_order_' . md5( $request['reference'] );
		if ( ! add_option( $lock, (string) time(), '', 'no' ) ) {
			if ( time() - (int) get_option( $lock ) < self::LOCK_SECONDS ) {
				return new WP_Error( 'busy', __( 'This order is being created.', 'yallapp' ), array( 'status' => 409 ) );
			}
			update_option( $lock, (string) time(), false );
		}
		try {
			$existing = self::find( $request['reference'] );
			if ( $existing ) {
				return self::answer( $existing, false );
			}
			return $this->create( $request );
		} finally {
			$this->clear();
			delete_option( $lock );
		}
	}

	/**
	 * The order's answer.
	 *
	 * @param WC_Order $order   Order.
	 * @param bool     $created Made now.
	 * @return array
	 */
	private static function answer( WC_Order $order, $created ) {
		return array(
			'order_id'     => (int) $order->get_id(),
			'order_number' => (string) $order->get_order_number(),
			'status'       => (string) $order->get_status(),
			'created'      => (bool) $created,
		);
	}

	/**
	 * Fills WooCommerce's cart for this request (its own session, never a shopper's) and prices
	 * it as its checkout does: shipping for the address, the slot's fee, the coupon and taxes.
	 *
	 * @param array $request The checked request.
	 * @return array|WP_Error `quote` (the amounts) and `fields` (the checkout's address fields).
	 */
	private function build( array $request ) {
		wc_load_cart();
		$cart = WC()->cart;
		if ( ! $cart || ! WC()->session || ! WC()->customer ) {
			return new WP_Error( 'store_unavailable', __( 'The shop is not available right now.', 'yallapp' ), array( 'status' => 503 ) );
		}
		$cart->empty_cart( false );
		$extras = $request['extras'];
		// 131 The slot and its fee (Checkout::slot_fee), the day, the card and the people, as the hand-off keeps them.
		WC()->session->set( Checkout::SESSION_DELIVERY, isset( $extras['delivery_date'] ) && is_string( $extras['delivery_date'] ) ? $extras['delivery_date'] : null );
		WC()->session->set( Checkout::SESSION_GIFT, isset( $extras['gift_message'] ) && is_string( $extras['gift_message'] ) ? sanitize_textarea_field( $extras['gift_message'] ) : null );
		WC()->session->set(
			Checkout::SESSION_EXTRA,
			array(
				'slot'       => isset( $extras['delivery_slot'] ) && is_string( $extras['delivery_slot'] ) ? sanitize_text_field( $extras['delivery_slot'] ) : null,
				'slot_label' => isset( $extras['slot_label'] ) && is_string( $extras['slot_label'] ) ? sanitize_text_field( $extras['slot_label'] ) : null,
				'fee'        => isset( $extras['fee'] ) && is_numeric( $extras['fee'] ) ? max( 0.0, (float) $extras['fee'] ) : 0.0,
				'sender'     => is_array( $extras['sender'] ?? null ) ? $extras['sender'] : null,
				'recipient'  => is_array( $extras['recipient'] ?? null ) ? $extras['recipient'] : null,
				'anonymous'  => ! empty( $extras['gift_anonymous'] ),
			)
		);
		$fields   = Paid_Order_Request::address_fields( $request, (string) WC()->countries->get_base_country() );
		$customer = WC()->customer;
		foreach ( $fields as $key => $value ) {
			$setter = 'set_' . $key;
			if ( is_callable( array( $customer, $setter ) ) ) {
				$customer->{$setter}( $value );
			}
		}
		$problems = array();
		$keys     = array();
		foreach ( $request['lines'] as $index => $line ) {
			$data           = ! empty( $line['addon_of'] ) ? array( 'yallapp_addon_of' => (int) $line['addon_of'] ) : array();
			$key            = $cart->add_to_cart( $line['product_id'], $line['quantity'], (int) $line['variation_id'], $line['attributes'], $data );
			$keys[ $index ] = $key;
			if ( ! $key ) {
				$product    = wc_get_product( $line['variation_id'] ? $line['variation_id'] : $line['product_id'] );
				$problems[] = array(
					'product_id'   => $line['product_id'],
					'variation_id' => $line['variation_id'],
					'problem'      => $product && ! $product->is_in_stock()
						/* translators: %s: the product's name. */
						? sprintf( __( '%s is out of stock.', 'yallapp' ), $product->get_name() )
						: __( 'This product is no longer available.', 'yallapp' ),
				);
			}
		}
		if ( '' !== $request['coupon'] ) {
			$cart->apply_coupon( $request['coupon'] );
		}
		$cart->calculate_shipping();
		$cart->calculate_totals();
		$stock = $cart->check_cart_item_stock();
		if ( is_wp_error( $stock ) && ! $problems ) {
			$problems[] = array( 'problem' => wp_strip_all_tags( $stock->get_error_message() ) );
		}
		wc_clear_notices();
		if ( $problems ) {
			return new WP_Error(
				'out_of_stock',
				(string) $problems[0]['problem'],
				array(
					'status'  => 409,
					'details' => array( 'lines' => $problems ),
				)
			);
		}
		$contents = $cart->get_cart();
		$subtotal = array();
		$tax      = array();
		foreach ( $request['lines'] as $index => $line ) {
			$item               = $contents[ $keys[ $index ] ] ?? array();
			$subtotal[ $index ] = (float) ( $item['line_subtotal'] ?? 0 );
			$tax[ $index ]      = (float) ( $item['line_subtotal_tax'] ?? 0 );
		}
		$amounts = Paid_Order_Request::amounts(
			$subtotal,
			$tax,
			array(
				'discount'     => $cart->get_discount_total(),
				'discount_tax' => $cart->get_discount_tax(),
				'shipping'     => $cart->get_shipping_total(),
				'shipping_tax' => $cart->get_shipping_tax(),
				'fees'         => $cart->get_fee_total(),
				'fees_tax'     => $cart->get_fee_tax(),
				'total'        => $cart->get_total( 'edit' ),
			),
			'incl' === get_option( 'woocommerce_tax_display_cart' ),
			wc_get_price_decimals()
		);
		$lines   = array();
		foreach ( $request['lines'] as $index => $line ) {
			$lines[] = array(
				'product_id'   => $line['product_id'],
				'variation_id' => $line['variation_id'],
				'total_amount' => $amounts['lines'][ $index ],
				'available'    => true,
			);
		}
		return array(
			'fields' => $fields,
			'quote'  => array(
				'currency'        => (string) get_woocommerce_currency(),
				'lines'           => $lines,
				'discount_amount' => $amounts['discount'],
				'shipping_amount' => $amounts['shipping'],
				'fee_amount'      => $amounts['fees'],
				'tax_amount'      => $amounts['tax'],
				'total_amount'    => $amounts['total'],
			),
		);
	}

	/**
	 * Makes the order with WooCommerce's checkout from the priced cart, and marks it paid.
	 *
	 * @param array $request The checked request (with its payment).
	 * @return array|WP_Error
	 */
	private function create( array $request ) {
		$built = $this->build( $request );
		if ( is_wp_error( $built ) ) {
			return $built;
		}
		$payment = $request['payment'];
		try {
			$order_id = WC()->checkout()->create_order( array_merge( $built['fields'], array( 'payment_method' => self::METHOD ) ) );
		} catch ( \Exception $e ) {
			$order_id = new WP_Error( 'order_failed', wp_strip_all_tags( $e->getMessage() ), array( 'status' => 409 ) );
		}
		if ( is_wp_error( $order_id ) ) {
			$data = (array) $order_id->get_error_data();
			return new WP_Error( 'order_failed', $order_id->get_error_message(), array( 'status' => (int) ( $data['status'] ?? 409 ) ) );
		}
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof WC_Order ) {
			return new WP_Error( 'order_failed', __( 'WooCommerce didn\'t make the order.', 'yallapp' ), array( 'status' => 503 ) );
		}
		if ( $request['customer_id'] && get_userdata( $request['customer_id'] ) ) {
			$order->set_customer_id( $request['customer_id'] );
		}
		if ( method_exists( $order, 'set_shipping_phone' ) && '' !== $built['fields']['shipping_phone'] ) {
			$order->set_shipping_phone( $built['fields']['shipping_phone'] );
		}
		$order->set_created_via( 'yallapp' );
		/* translators: %s: the payment gateway's name, like Stripe. */
		$order->set_payment_method_title( sprintf( __( '%s (in app)', 'yallapp' ), $payment['gateway'] ) );
		$order->update_meta_data( self::META_REFERENCE, $request['reference'] );
		$order->update_meta_data( self::META_TRANSACTION, $payment['transaction_id'] );
		$order->update_meta_data( self::META_GATEWAY, $payment['gateway'] );
		$order->save();
		$note = '' !== $payment['note']
			? $payment['note']
			/* translators: 1: the payment gateway's name, 2: its reference for the payment. */
			: sprintf( __( 'Paid in the app via %1$s, reference %2$s', 'yallapp' ), $payment['gateway'], $payment['transaction_id'] );
		$order->add_order_note( $note );
		if ( abs( (float) $order->get_total() - (float) $payment['amount'] ) >= 0.01 ) {
			/* translators: 1: what was paid in the app, 2: the order's total now. */
			$order->add_order_note( sprintf( __( 'The app\'s payment was %1$s; the order\'s total is %2$s. Check the prices and stock.', 'yallapp' ), $payment['amount'], wc_format_decimal( $order->get_total(), wc_get_price_decimals() ) ) );
		}
		$order->payment_complete( $payment['transaction_id'] );
		$order = wc_get_order( $order->get_id() );
		return self::answer( $order instanceof WC_Order ? $order : wc_get_order( $order_id ), true );
	}

	/**
	 * Empties this request's cart and the session's delivery details.
	 *
	 * @return void
	 */
	private function clear() {
		if ( function_exists( 'WC' ) && WC()->cart ) {
			WC()->cart->empty_cart( false );
		}
		if ( function_exists( 'WC' ) && WC()->session ) {
			WC()->session->set( Checkout::SESSION_DELIVERY, null );
			WC()->session->set( Checkout::SESSION_GIFT, null );
			WC()->session->set( Checkout::SESSION_EXTRA, null );
		}
		if ( function_exists( 'wc_clear_notices' ) ) {
			wc_clear_notices();
		}
	}
}
