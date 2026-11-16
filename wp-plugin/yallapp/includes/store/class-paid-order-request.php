<?php
/**
 * The signature and body of Yallapp's "price or create an order paid in the app" request.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

use Yallapp\License\Refresh_Signature;

/**
 * 134 `POST /store/paid-orders` (docs/api/openapi.yaml, storePaidOrder): an order paid inside the
 * app, through the owner's own gateway in Yallapp. Yallapp asks the site to price it for the
 * customer's address right before the payment (`quote`), and to create it, marked paid, once the
 * payment is verified (`create`). Signed like `POST /billing/access`: the headers
 * `Yallapp-Timestamp` and `Yallapp-Signature`, the lowercase hex HMAC-SHA256 of
 * `yallapp-store-order:<timestamp>:<the raw body>`, keyed with the license key in capitals. Pure.
 */
class Paid_Order_Request {

	/**
	 * What is signed, before the timestamp.
	 */
	const PREFIX = 'yallapp-store-order:';

	/**
	 * The largest body accepted.
	 */
	const MAX_BODY = 65536;

	/**
	 * The signature of a body.
	 *
	 * @param string $key       License key.
	 * @param int    $timestamp Unix time in seconds.
	 * @param string $raw       The body as sent.
	 * @return string
	 */
	public static function sign( $key, $timestamp, $raw ) {
		return hash_hmac( 'sha256', self::PREFIX . (int) $timestamp . ':' . (string) $raw, strtoupper( trim( (string) $key ) ) );
	}

	/**
	 * Whether the request is Yallapp's: a license key is saved, the timestamp is within 5 minutes
	 * of now, and the signature matches it and the body.
	 *
	 * @param string $key       The saved license key ('' when none).
	 * @param mixed  $timestamp The `Yallapp-Timestamp` header.
	 * @param mixed  $signature The `Yallapp-Signature` header.
	 * @param mixed  $raw       The body as received.
	 * @param int    $now       Unix time now.
	 * @return bool
	 */
	public static function verify( $key, $timestamp, $signature, $raw, $now ) {
		if ( '' === trim( (string) $key ) || ! is_string( $raw ) || strlen( $raw ) > self::MAX_BODY ) {
			return false;
		}
		if ( ! is_string( $signature ) || 1 !== preg_match( '/^[0-9a-f]{64}$/', $signature ) ) {
			return false;
		}
		if ( ! is_string( $timestamp ) || 1 !== preg_match( '/^\d{1,12}$/', trim( $timestamp ) ) ) {
			return false;
		}
		$timestamp = (int) trim( $timestamp );
		if ( abs( (int) $now - $timestamp ) > Refresh_Signature::MAX_AGE ) {
			return false;
		}
		return hash_equals( self::sign( $key, $timestamp, $raw ), $signature );
	}

	/**
	 * A decimal amount ("150.00"), or null.
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	private static function amount( $value ) {
		if ( is_int( $value ) || is_float( $value ) ) {
			$value = (string) $value;
		}
		return is_string( $value ) && 1 === preg_match( '/^\d{1,9}(\.\d{1,6})?$/', trim( $value ) ) ? trim( $value ) : null;
	}

	/**
	 * One line of text, at most `$max` characters.
	 *
	 * @param mixed $value Value.
	 * @param int   $max   Longest.
	 * @return string
	 */
	private static function text( $value, $max ) {
		if ( ! is_string( $value ) ) {
			return '';
		}
		$text = trim( (string) preg_replace( '/\s+/u', ' ', wp_strip_all_tags( $value ) ) );
		return function_exists( 'mb_substr' ) ? mb_substr( $text, 0, $max ) : substr( $text, 0, $max );
	}

	/**
	 * A positive whole number, or null.
	 *
	 * @param mixed $value Value.
	 * @return int|null
	 */
	private static function id( $value ) {
		return is_int( $value ) && $value > 0 ? $value : null;
	}

	/**
	 * A person's details: name, phone, email, city, address, country (two letters, or '').
	 *
	 * @param mixed $value Value.
	 * @return array{name: string, phone: string, email: string, city: string, address: string, country: string}
	 */
	private static function person( $value ) {
		$value   = is_array( $value ) ? $value : array();
		$country = strtoupper( self::text( $value['country'] ?? '', 2 ) );
		$email   = self::text( $value['email'] ?? '', 191 );
		return array(
			'name'    => self::text( $value['name'] ?? '', 80 ),
			'phone'   => self::text( $value['phone'] ?? '', 24 ),
			'email'   => false !== strpos( $email, '@' ) ? $email : '',
			'city'    => self::text( $value['city'] ?? '', 60 ),
			'address' => self::text( $value['address'] ?? '', 300 ),
			'country' => 1 === preg_match( '/^[A-Z]{2}$/', $country ) ? $country : '',
		);
	}

	/**
	 * The request's fields, checked: null when one is missing or wrong.
	 *
	 * @param mixed $data Decoded body.
	 * @return array|null `action`, `reference`, `currency`, `lines`, `coupon`, `extras`, `customer_id`, `billing`, `shipping`, `platform` and, to create, `payment`.
	 */
	public static function parse( $data ) {
		if ( ! is_array( $data ) ) {
			return null;
		}
		$action    = $data['action'] ?? null;
		$reference = $data['reference'] ?? null;
		$currency  = $data['currency'] ?? null;
		if ( ! in_array( $action, array( 'quote', 'create' ), true ) || ! is_string( $reference ) || 1 !== preg_match( '/^yallapp-order-\d{1,20}$/', $reference ) ) {
			return null;
		}
		if ( ! is_string( $currency ) || 1 !== preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			return null;
		}
		$raw = $data['lines'] ?? null;
		if ( ! is_array( $raw ) || ! $raw || count( $raw ) > 50 ) {
			return null;
		}
		$lines = array();
		foreach ( $raw as $line ) {
			$line       = is_array( $line ) ? $line : array();
			$product    = self::id( $line['product_id'] ?? null );
			$variation  = isset( $line['variation_id'] ) ? self::id( $line['variation_id'] ) : null;
			$quantity   = self::id( $line['quantity'] ?? null );
			$attributes = array();
			foreach ( is_array( $line['attributes'] ?? null ) ? $line['attributes'] : array() as $name => $value ) {
				if ( is_string( $name ) && 1 === preg_match( '/^[A-Za-z0-9_\-%.]{1,100}$/', $name ) && is_string( $value ) && strlen( $value ) <= 200 && count( $attributes ) < 20 ) {
					$attributes[ $name ] = $value;
				}
			}
			if ( ! $product || ! $quantity || $quantity > 999 || ( isset( $line['variation_id'] ) && null !== $line['variation_id'] && ! $variation ) ) {
				return null;
			}
			$lines[] = array(
				'product_id'   => $product,
				'variation_id' => $variation,
				'quantity'     => $quantity,
				'attributes'   => $attributes,
				'addon_of'     => isset( $line['addon_of'] ) ? self::id( $line['addon_of'] ) : null,
			);
		}
		$coupon   = isset( $data['coupon'] ) && is_string( $data['coupon'] ) ? self::text( $data['coupon'], 50 ) : '';
		$customer = isset( $data['customer_id'] ) ? self::id( $data['customer_id'] ) : null;
		$platform = in_array( $data['platform'] ?? null, array( 'android', 'ios' ), true ) ? $data['platform'] : 'android';
		$request  = array(
			'action'      => $action,
			'reference'   => $reference,
			'currency'    => $currency,
			'lines'       => $lines,
			'coupon'      => $coupon,
			'extras'      => is_array( $data['extras'] ?? null ) ? $data['extras'] : array(),
			'customer_id' => $customer,
			'billing'     => self::person( $data['billing'] ?? null ),
			'shipping'    => self::person( $data['shipping'] ?? null ),
			'platform'    => $platform,
			'payment'     => null,
		);
		if ( '' === $request['billing']['name'] || '' === $request['billing']['email'] ) {
			return null;
		}
		if ( 'create' === $action ) {
			$payment     = is_array( $data['payment'] ?? null ) ? $data['payment'] : array();
			$gateway     = self::text( $payment['gateway'] ?? '', 40 );
			$transaction = self::text( $payment['transaction_id'] ?? '', 200 );
			$amount      = self::amount( $payment['amount'] ?? null );
			if ( '' === $gateway || '' === $transaction || null === $amount || ( $payment['currency'] ?? null ) !== $currency ) {
				return null;
			}
			$request['payment'] = array(
				'gateway'        => $gateway,
				'transaction_id' => $transaction,
				'amount'         => $amount,
				'note'           => self::text( $payment['note'] ?? '', 300 ),
			);
		}
		return $request;
	}

	/**
	 * A name as first and last name (WooCommerce's fields): the last word is the last name.
	 *
	 * @param string $name Name.
	 * @return array{0: string, 1: string}
	 */
	public static function split_name( $name ) {
		$parts = preg_split( '/\s+/u', trim( (string) $name ) );
		$parts = is_array( $parts ) ? array_values( array_filter( $parts, 'strlen' ) ) : array();
		if ( count( $parts ) < 2 ) {
			return array( (string) ( $parts[0] ?? '' ), '' );
		}
		$last = array_pop( $parts );
		return array( implode( ' ', $parts ), $last );
	}

	/**
	 * 131 The order's billing and shipping fields: billing is the buyer (the gift's sender, when
	 * there is one), shipping is where it goes (the gift's recipient, else the buyer). A country
	 * left out is the store's own (`$base`).
	 *
	 * @param array  $request The checked request.
	 * @param string $base    The store's country.
	 * @return array<string, string> WooCommerce checkout fields.
	 */
	public static function address_fields( array $request, $base ) {
		$billing   = $request['billing'];
		$shipping  = $request['shipping'];
		$sender    = is_array( $request['extras']['sender'] ?? null ) ? self::person( $request['extras']['sender'] ) : null;
		$recipient = is_array( $request['extras']['recipient'] ?? null ) ? self::person( $request['extras']['recipient'] ) : null;
		if ( $sender && '' !== $sender['name'] ) {
			$billing['name']  = $sender['name'];
			$billing['phone'] = '' !== $sender['phone'] ? $sender['phone'] : $billing['phone'];
			$billing['email'] = '' !== $sender['email'] ? $sender['email'] : $billing['email'];
		}
		if ( $recipient && '' !== $recipient['address'] ) {
			$shipping = array_merge( $recipient, array( 'country' => '' !== $recipient['country'] ? $recipient['country'] : $shipping['country'] ) );
		}
		if ( '' === $shipping['address'] ) {
			$shipping = $billing;
		}
		list( $billing_first, $billing_last )   = self::split_name( $billing['name'] );
		list( $shipping_first, $shipping_last ) = self::split_name( '' !== $shipping['name'] ? $shipping['name'] : $billing['name'] );
		return array(
			'billing_first_name'  => $billing_first,
			'billing_last_name'   => $billing_last,
			'billing_phone'       => $billing['phone'],
			'billing_email'       => $billing['email'],
			'billing_address_1'   => $billing['address'],
			'billing_city'        => $billing['city'],
			'billing_country'     => '' !== $billing['country'] ? $billing['country'] : (string) $base,
			'shipping_first_name' => $shipping_first,
			'shipping_last_name'  => $shipping_last,
			'shipping_phone'      => $shipping['phone'],
			'shipping_address_1'  => $shipping['address'],
			'shipping_city'       => $shipping['city'],
			'shipping_country'    => '' !== $shipping['country'] ? $shipping['country'] : (string) $base,
		);
	}

	/**
	 * The amounts the app's payment page shows, from WooCommerce's cart (`excl`: prices shown
	 * without tax, so the taxes are a line of their own). Each line before the coupon; `tax` is
	 * what is left of the total (taxes, and a cent of rounding), never below zero.
	 *
	 * @param float[] $lines    Each line's subtotal (before the coupon, without tax).
	 * @param float[] $line_tax Each line's subtotal tax.
	 * @param array   $cart     discount, discount_tax, shipping, shipping_tax, fees, fees_tax, total.
	 * @param bool    $incl     Prices are shown with tax.
	 * @param int     $decimals The store's decimals.
	 * @return array{lines: string[], discount: string, shipping: string, fees: string, tax: string, total: string}
	 */
	public static function amounts( array $lines, array $line_tax, array $cart, $incl, $decimals = 2 ) {
		$round    = static function ( $value ) use ( $decimals ) {
			return round( (float) $value, (int) $decimals );
		};
		$shown    = array();
		$subtotal = 0.0;
		foreach ( $lines as $i => $line ) {
			$value     = $round( (float) $line + ( $incl ? (float) ( $line_tax[ $i ] ?? 0 ) : 0 ) );
			$shown[]   = $value;
			$subtotal += $value;
		}
		$discount = $round( (float) ( $cart['discount'] ?? 0 ) + ( $incl ? (float) ( $cart['discount_tax'] ?? 0 ) : 0 ) );
		$shipping = $round( (float) ( $cart['shipping'] ?? 0 ) + ( $incl ? (float) ( $cart['shipping_tax'] ?? 0 ) : 0 ) );
		$fees     = $round( (float) ( $cart['fees'] ?? 0 ) + ( $incl ? (float) ( $cart['fees_tax'] ?? 0 ) : 0 ) );
		$total    = $round( (float) ( $cart['total'] ?? 0 ) );
		$tax      = $round( $total - ( $subtotal - $discount + $shipping + $fees ) );
		if ( $tax < 0 ) {
			$discount = $round( $discount - $tax );
			$tax      = 0.0;
		}
		$format = static function ( $value ) use ( $decimals ) {
			return number_format( (float) $value, (int) $decimals, '.', '' );
		};
		return array(
			'lines'    => array_map( $format, $shown ),
			'discount' => $format( $discount ),
			'shipping' => $format( $shipping ),
			'fees'     => $format( $fees ),
			'tax'      => $format( $tax ),
			'total'    => $format( $total ),
		);
	}
}
