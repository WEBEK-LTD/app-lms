<?php
/**
 * Paying inside the app, through the owner's gateway in Yallapp.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

use WC_Customer;
use WP_Error;
use Yallapp\License\License_Client;

/**
 * 134 Pay inside the app (Demo). When the owner chose it in the Yallapp dashboard
 * (`LicenseStatus.store_checkout`), the app's checkout ends in the app: the plugin prices the cart
 * as it does for the hand-off, then asks Yallapp for the payment page of the owner's own gateway
 * (platform.yaml, startStorePayment) instead of opening the site's checkout. Yallapp creates the
 * order here once the payment is verified (`POST /store/paid-orders`). An app that doesn't ask
 * for it, or Yallapp refusing it, keeps the site's own checkout.
 */
class In_App_Payment {

	/**
	 * License client.
	 *
	 * @var License_Client
	 */
	private $license;

	/**
	 * Constructor.
	 *
	 * @param License_Client $license License client.
	 */
	public function __construct( License_Client $license ) {
		$this->license = $license;
	}

	/**
	 * `LicenseStatus.store_checkout`, as kept: the gateway's ID and name; null when the store pays
	 * on its own checkout (or the platform sends something else). Pure.
	 *
	 * @param mixed $value The platform's value.
	 * @return array{payment: string, gateway: string, gateway_name: string}|null
	 */
	public static function of_status( $value ) {
		if ( ! is_array( $value ) || 'in_app' !== ( $value['payment'] ?? null ) ) {
			return null;
		}
		$gateway = is_string( $value['gateway'] ?? null ) && 1 === preg_match( '/^[a-z]{2,20}$/', $value['gateway'] ) ? $value['gateway'] : null;
		if ( null === $gateway ) {
			return null;
		}
		$name = is_string( $value['gateway_name'] ?? null ) ? sanitize_text_field( substr( $value['gateway_name'], 0, 40 ) ) : '';
		return array(
			'payment'      => 'in_app',
			'gateway'      => $gateway,
			'gateway_name' => '' !== $name ? $name : $gateway,
		);
	}

	/**
	 * `StoreConfig.checkout_payment`: `in_app` while the store pays inside the app. Pure.
	 *
	 * @param array $status The license status.
	 * @return string
	 */
	public static function mode( array $status ) {
		return null !== self::of_status( $status['store_checkout'] ?? null ) ? 'in_app' : 'platform';
	}

	/**
	 * The request for Yallapp's payment page: the lines as priced (WooCommerce's IDs, their
	 * attributes and add-ons), the coupon and its discount, the slot's fee, the checked extras and
	 * the buyer the site knows. Pure.
	 *
	 * @param array  $lines    Each `product_id`, `variation_id`, `quantity`, `attributes`, `addon_of`, `name`, `unit`, `total`, `digital`.
	 * @param string $currency The store's currency.
	 * @param string $coupon   The coupon, or ''.
	 * @param float  $discount Its discount.
	 * @param array  $extras   The checked delivery and gift details (Checkout::check_extras()).
	 * @param array  $buyer    `user_id`, `name`, `email`, `phone`, `city`, `address`, `country`.
	 * @param string $platform android or ios.
	 * @param string $lang     The app's language, or ''.
	 * @param int    $decimals The store's decimals.
	 * @return array
	 */
	public static function start_body( array $lines, $currency, $coupon, $discount, array $extras, array $buyer, $platform, $lang, $decimals = 2 ) {
		$amount = static function ( $value ) use ( $decimals ) {
			return number_format( (float) $value, (int) $decimals, '.', '' );
		};
		$out    = array();
		foreach ( $lines as $line ) {
			$out[] = array(
				'product_id'   => (int) $line['product_id'],
				'variation_id' => ! empty( $line['variation_id'] ) ? (int) $line['variation_id'] : null,
				'quantity'     => (int) $line['quantity'],
				'name'         => (string) $line['name'],
				'unit_amount'  => $amount( $line['unit'] ),
				'total_amount' => $amount( $line['total'] ),
				'attributes'   => (object) ( is_array( $line['attributes'] ?? null ) ? $line['attributes'] : array() ),
				'addon_of'     => ! empty( $line['addon_of'] ) ? (int) $line['addon_of'] : null,
				'digital'      => ! empty( $line['digital'] ),
			);
		}
		return array(
			'currency'        => (string) $currency,
			'platform'        => 'ios' === $platform ? 'ios' : 'android',
			'lang'            => (string) $lang,
			'lines'           => $out,
			'coupon'          => '' !== (string) $coupon ? (string) $coupon : null,
			'discount_amount' => $amount( $discount ),
			'fee_amount'      => $amount( (float) ( $extras['fee'] ?? 0 ) ),
			'extras'          => (object) $extras,
			'customer'        => array(
				'user_id' => ! empty( $buyer['user_id'] ) ? (int) $buyer['user_id'] : null,
				'name'    => (string) ( $buyer['name'] ?? '' ),
				'email'   => (string) ( $buyer['email'] ?? '' ),
				'phone'   => (string) ( $buyer['phone'] ?? '' ),
				'city'    => (string) ( $buyer['city'] ?? '' ),
				'address' => (string) ( $buyer['address'] ?? '' ),
				'country' => (string) ( $buyer['country'] ?? '' ),
			),
		);
	}

	/**
	 * Whether a payment page's address is Yallapp's (the platform the plugin talks to). Pure.
	 *
	 * @param mixed  $url      The address Yallapp sent.
	 * @param string $platform The platform API's base URL.
	 * @return bool
	 */
	public static function is_platform_url( $url, $platform ) {
		if ( ! is_string( $url ) || strlen( $url ) > 500 ) {
			return false;
		}
		$host   = wp_parse_url( $url, PHP_URL_HOST );
		$scheme = wp_parse_url( $url, PHP_URL_SCHEME );
		$base   = wp_parse_url( $platform, PHP_URL_HOST );
		return is_string( $host ) && '' !== $host && $host === $base && ( 'https' === $scheme || ( 'http' === $scheme && 'https' !== wp_parse_url( $platform, PHP_URL_SCHEME ) ) );
	}

	/**
	 * The signed-in customer's details the site has (their billing details), for the payment page.
	 *
	 * @param int $user_id WordPress user, or 0.
	 * @return array
	 */
	private static function buyer( $user_id ) {
		if ( ! $user_id || ! class_exists( 'WC_Customer' ) ) {
			return array( 'user_id' => null );
		}
		try {
			$customer = new WC_Customer( (int) $user_id );
		} catch ( \Exception $e ) {
			return array( 'user_id' => (int) $user_id );
		}
		$user = get_userdata( (int) $user_id );
		$name = trim( $customer->get_billing_first_name() . ' ' . $customer->get_billing_last_name() );
		return array(
			'user_id' => (int) $user_id,
			'name'    => '' !== $name ? $name : ( $user ? (string) $user->display_name : '' ),
			'email'   => '' !== $customer->get_billing_email() ? $customer->get_billing_email() : ( $user ? (string) $user->user_email : '' ),
			'phone'   => (string) $customer->get_billing_phone(),
			'city'    => (string) $customer->get_billing_city(),
			'address' => trim( $customer->get_billing_address_1() . ' ' . $customer->get_billing_address_2() ),
			'country' => (string) $customer->get_billing_country(),
		);
	}

	/**
	 * `StoreConfig.checkout_payment` now.
	 *
	 * @return string `in_app` or `platform`.
	 */
	public function current() {
		return $this->license->has_key() ? self::mode( $this->license->status() ) : 'platform';
	}

	/**
	 * Asks Yallapp for the payment page of the app's priced cart.
	 *
	 * @param int    $user_id  The signed-in customer, or 0.
	 * @param array  $lines    The priced lines (see start_body()).
	 * @param array  $extras   The checked extras.
	 * @param string $coupon   The coupon, or ''.
	 * @param string $platform android or ios.
	 * @return array|WP_Error {url, expires_at, open_in, payment, payment_id, gateway}
	 */
	public function start( $user_id, array $lines, array $extras, $coupon, $platform ) {
		if ( 'in_app' !== self::mode( $this->license->status() ) ) {
			return new WP_Error( 'in_app_payment_off', __( 'This store\'s customers pay on its own checkout.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$subtotal = 0.0;
		$count    = 0;
		foreach ( $lines as $line ) {
			$subtotal += (float) $line['total'];
			$count    += (int) $line['quantity'];
		}
		$checked  = '' !== (string) $coupon ? Coupon_Quote::check( $coupon, $subtotal, $count ) : null;
		$discount = $checked ? (float) $checked['discount'] : 0.0;
		$body     = self::start_body( $lines, get_woocommerce_currency(), $checked ? $coupon : '', $discount, $extras, self::buyer( $user_id ), $platform, substr( (string) get_user_locale(), 0, 2 ), wc_get_price_decimals() );
		$result   = $this->license->start_store_payment( $body );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( ! self::is_platform_url( $result['url'] ?? null, License_Client::base_url() ) ) {
			return new WP_Error( 'platform_error', __( 'Yallapp sent no payment page.', 'yallapp' ), array( 'status' => 502 ) );
		}
		return array(
			'url'        => (string) $result['url'],
			'expires_at' => isset( $result['expires_at'] ) ? sanitize_text_field( (string) $result['expires_at'] ) : gmdate( 'c', time() + HOUR_IN_SECONDS ),
			'open_in'    => 'in_app',
			'payment'    => 'in_app',
			'payment_id' => isset( $result['payment_id'] ) ? sanitize_text_field( (string) $result['payment_id'] ) : null,
			'gateway'    => isset( $result['gateway'] ) ? sanitize_key( (string) $result['gateway'] ) : null,
		);
	}

	/**
	 * A cart line's amounts as the shop shows them, before any coupon.
	 *
	 * @param \WC_Product $product  Product.
	 * @param int         $quantity Quantity.
	 * @return array{unit: float, total: float}
	 */
	public static function line_amounts( $product, $quantity ) {
		return array(
			'unit'  => (float) wc_get_price_to_display( $product ),
			'total' => (float) wc_get_price_to_display( $product, array( 'qty' => max( 1, (int) $quantity ) ) ),
		);
	}
}
