<?php
/**
 * The app's cart, the checkout hand-off and the order's delivery details.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

use WC_Order;
use WC_Product;
use WC_Product_Variation;
use WP_Error;
use Yallapp\Commerce\Money;
use Yallapp\Commerce\Order_Returns;
use Yallapp\Content\Magic_Links;
use Yallapp\Crypto;
use Yallapp\Settings;

/**
 * Prices the cart the app keeps, and hands it to the site's own checkout: a one-time link
 * fills the WooCommerce cart (after signing the customer in, when they are signed in to
 * the app) and opens the checkout page. The delivery date and gift message chosen in the
 * app are kept in the WooCommerce session and saved on the order, where the shop sees
 * them in the order screen and the emails.
 */
class Checkout {

	const QUERY_ARG          = 'yallapp_cart';
	const META_DELIVERY_DATE = '_yallapp_delivery_date';
	const META_GIFT_MESSAGE  = '_yallapp_gift_message';
	const SESSION_DELIVERY   = 'yallapp_delivery_date';
	const SESSION_GIFT       = 'yallapp_gift_message';

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Hooks into WooCommerce.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'wp_loaded', array( $this, 'fill_cart' ), 30 );
		add_action( 'woocommerce_checkout_create_order', array( $this, 'save_on_order' ) );
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( $this, 'save_on_order' ) );
		add_action( 'woocommerce_review_order_before_payment', array( $this, 'checkout_summary' ) );
		add_action( 'woocommerce_admin_order_data_after_shipping_address', array( $this, 'admin_details' ) );
		add_action( 'woocommerce_order_details_after_order_table', array( $this, 'customer_details' ) );
		add_filter( 'woocommerce_email_order_meta_fields', array( $this, 'email_fields' ), 10, 3 );
	}

	/**
	 * StoreConfig shape.
	 *
	 * @return array
	 */
	public function config() {
		$returns = Order_Returns::days( $this->settings->get( 'store_return_days' ) );
		return array(
			'currency'          => (string) get_woocommerce_currency(),
			'guest_checkout'    => 'yes' === get_option( 'woocommerce_enable_guest_checkout' ),
			'checkout_opens_in' => (string) $this->settings->get( 'checkout_opens_in' ),
			'reviews'           => wc_reviews_enabled(),
			'delivery_date'     => array(
				'enabled'         => (bool) $this->settings->get( 'store_delivery_date' ),
				'required'        => (bool) $this->settings->get( 'store_delivery_date' ) && (bool) $this->settings->get( 'store_delivery_date_required' ),
				'min_days'        => (int) $this->settings->get( 'store_delivery_min_days' ),
				'max_days'        => max( (int) $this->settings->get( 'store_delivery_min_days' ), (int) $this->settings->get( 'store_delivery_max_days' ) ),
				'closed_weekdays' => array_map( 'intval', (array) $this->settings->get( 'store_closed_weekdays' ) ),
			),
			'gift_message'      => array(
				'enabled'    => (bool) $this->settings->get( 'store_gift_message' ),
				'max_length' => max( 1, min( 500, (int) $this->settings->get( 'store_gift_message_max' ) ) ),
			),
			// 91.3 Returns asked for in the app.
			'returns'           => $returns ? array(
				'enabled' => true,
				'days'    => $returns,
			) : null,
		);
	}

	/**
	 * Prices the app's cart: current prices, stock and quantity limits.
	 *
	 * @param array       $lines    CartInput lines.
	 * @param string      $platform android or ios.
	 * @param string|null $coupon   91.1 The coupon the customer typed.
	 * @return array Cart shape.
	 */
	public function quote( array $lines, $platform, $coupon = null ) {
		$decimals = wc_get_price_decimals();
		$items    = array();
		$count    = 0;
		$subtotal = 0.0;
		foreach ( $lines as $line ) {
			$checked  = $this->check_line( (array) $line, $platform );
			$product  = $checked['product'];
			$quantity = $checked['quantity'];
			$unit     = $product ? (float) wc_get_price_to_display( $product ) : 0.0;
			$total    = $product ? (float) wc_get_price_to_display( $product, array( 'qty' => max( 1, $quantity ) ) ) : 0.0;
			$image    = $product ? self::image( $product ) : null;
			if ( $checked['available'] ) {
				$count    += $quantity;
				$subtotal += $total;
			}
			$items[] = array(
				'product_id'   => (int) ( $line['product_id'] ?? 0 ),
				'variation_id' => ! empty( $line['variation_id'] ) ? (int) $line['variation_id'] : null,
				'quantity'     => $quantity,
				'name'         => $checked['name'],
				'image_url'    => $image,
				'unit_price'   => Money::plain( wc_price( $unit ) ),
				'line_total'   => Money::plain( wc_price( $total ) ),
				'available'    => $checked['available'],
				'problem'      => $checked['problem'],
				'max_quantity' => $product ? Catalog::max_quantity( $product ) : null,
				'digital'      => $product ? Catalog::is_digital( $product ) : false,
			);
		}
		// 91.1 The coupon, and the total so far: shipping and taxes come from the checkout's address.
		$checked = null !== $coupon && '' !== trim( (string) $coupon ) ? Coupon_Quote::check( $coupon, $subtotal, $count ) : null;
		$off     = $checked ? (float) $checked['discount'] : 0.0;
		$total   = max( 0.0, $subtotal - $off );
		return array(
			'lines'           => $items,
			'item_count'      => $count,
			'subtotal'        => Money::plain( wc_price( $subtotal ) ),
			'subtotal_amount' => number_format( $subtotal, $decimals, '.', '' ),
			'currency'        => (string) get_woocommerce_currency(),
			'coupon'          => $checked ? $checked['json'] : null,
			'discount'        => $off > 0 ? Money::plain( wc_price( $off ) ) : null,
			'shipping'        => null,
			'tax'             => null,
			'total'           => Money::plain( wc_price( $total ) ),
			'total_amount'    => number_format( $total, $decimals, '.', '' ),
			'total_final'     => false,
		);
	}

	/**
	 * Creates the one-time checkout link.
	 *
	 * @param int    $user_id  Signed-in customer, or 0.
	 * @param array  $lines    CartInput lines.
	 * @param string $platform android or ios.
	 * @param array  $extras   delivery_date, gift_message, 91.1 coupon.
	 * @return array|WP_Error {url, expires_at, open_in}
	 */
	public function link( $user_id, array $lines, $platform, array $extras ) {
		$coupon = isset( $extras['coupon'] ) && is_string( $extras['coupon'] ) ? wc_format_coupon_code( $extras['coupon'] ) : '';
		unset( $extras['coupon'] );
		if ( ! $user_id && 'yes' !== get_option( 'woocommerce_enable_guest_checkout' ) ) {
			return new WP_Error( 'unauthorized', __( 'Please sign in to check out.', 'yallapp' ), array( 'status' => 401 ) );
		}
		$problems = array();
		$filled   = array();
		foreach ( $lines as $line ) {
			$checked = $this->check_line( (array) $line, $platform );
			if ( ! $checked['available'] || (int) ( $line['quantity'] ?? 0 ) !== $checked['quantity'] ) {
				if ( $checked['digital_on_ios'] ) {
					return new WP_Error( 'purchase_not_allowed', __( 'Digital products can be bought on the website.', 'yallapp' ), array( 'status' => 403 ) );
				}
				$problems[] = array(
					'product_id'   => (int) ( $line['product_id'] ?? 0 ),
					'variation_id' => ! empty( $line['variation_id'] ) ? (int) $line['variation_id'] : null,
					'problem'      => $checked['problem'] ? $checked['problem'] : __( 'This product is no longer available.', 'yallapp' ),
				);
				continue;
			}
			$filled[] = array(
				'product_id'   => (int) $line['product_id'],
				'variation_id' => ! empty( $line['variation_id'] ) ? (int) $line['variation_id'] : 0,
				'quantity'     => $checked['quantity'],
				'attributes'   => $checked['attributes'],
			);
		}
		if ( $problems ) {
			return new WP_Error(
				'cart_changed',
				__( 'Some items in your cart changed. Please check your cart.', 'yallapp' ),
				array(
					'status'  => 409,
					'details' => array( 'lines' => $problems ),
				)
			);
		}
		$extras = $this->check_extras( $extras );
		if ( is_wp_error( $extras ) ) {
			return $extras;
		}
		$opens_in = (string) $this->settings->get( 'checkout_opens_in' );
		$app_view = 'in_app' === $opens_in && (bool) $this->settings->get( 'hide_site_chrome_in_app' );
		$token    = Crypto::token( 32 );
		set_transient(
			'yallapp_cart_' . Crypto::hash( $token ),
			array(
				'user_id'  => (int) $user_id,
				'lines'    => $filled,
				'extras'   => $extras,
				'coupon'   => $coupon,
				'app_view' => $app_view,
			),
			Magic_Links::TTL
		);
		$target = add_query_arg( self::QUERY_ARG, rawurlencode( $token ), home_url( '/' ) );
		return array(
			'url'        => $user_id ? Magic_Links::create( (int) $user_id, $target, $app_view ) : $target,
			'expires_at' => gmdate( 'c', time() + Magic_Links::TTL ),
			'open_in'    => $opens_in,
		);
	}

	/**
	 * Fills the WooCommerce cart from a checkout link and opens the checkout, once. Runs after
	 * WooCommerce loads the cart, on the request after sign-in, so the cart belongs to the
	 * signed-in customer.
	 *
	 * @return void
	 */
	public function fill_cart() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- The token is the credential.
		if ( empty( $_GET[ self::QUERY_ARG ] ) || ! Catalog::available() ) {
			return;
		}
		$token = sanitize_text_field( wp_unslash( $_GET[ self::QUERY_ARG ] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$key   = 'yallapp_cart_' . Crypto::hash( $token );
		$cart  = get_transient( $key );
		delete_transient( $key );
		nocache_headers();
		if ( ! is_array( $cart ) || ( $cart['user_id'] && get_current_user_id() !== (int) $cart['user_id'] ) ) {
			wp_safe_redirect( home_url( '/' ) );
			exit;
		}
		if ( null === WC()->cart && function_exists( 'wc_load_cart' ) ) {
			wc_load_cart();
		}
		WC()->cart->empty_cart();
		foreach ( $cart['lines'] as $line ) {
			WC()->cart->add_to_cart( $line['product_id'], $line['quantity'], $line['variation_id'], $line['attributes'] );
		}
		// 91.1 The app's coupon, as WooCommerce's checkout applies it (it says so when it can't).
		if ( ! empty( $cart['coupon'] ) ) {
			WC()->cart->apply_coupon( (string) $cart['coupon'] );
		}
		WC()->session->set( self::SESSION_DELIVERY, $cart['extras']['delivery_date'] );
		WC()->session->set( self::SESSION_GIFT, $cart['extras']['gift_message'] );
		if ( ! is_user_logged_in() ) {
			WC()->session->set_customer_session_cookie( true );
		}
		if ( $cart['app_view'] ) {
			setcookie( Magic_Links::APP_VIEW, '1', 0, COOKIEPATH ? COOKIEPATH : '/', COOKIE_DOMAIN, is_ssl(), true );
		}
		$notice = $this->extras_text( (array) $cart['extras'] );
		if ( '' !== $notice ) {
			wc_add_notice( esc_html( $notice ), 'notice' );
		}
		wp_safe_redirect( wc_get_checkout_url() );
		exit;
	}

	/**
	 * Saves the delivery date and gift message from the session on a new order.
	 *
	 * @param WC_Order $order Order.
	 * @return void
	 */
	public function save_on_order( $order ) {
		if ( ! $order instanceof WC_Order || ! function_exists( 'WC' ) || ! WC()->session ) {
			return;
		}
		$date = (string) WC()->session->get( self::SESSION_DELIVERY );
		$gift = (string) WC()->session->get( self::SESSION_GIFT );
		if ( '' !== $date ) {
			$order->update_meta_data( self::META_DELIVERY_DATE, $date );
		}
		if ( '' !== $gift ) {
			$order->update_meta_data( self::META_GIFT_MESSAGE, $gift );
		}
		WC()->session->set( self::SESSION_DELIVERY, null );
		WC()->session->set( self::SESSION_GIFT, null );
	}

	/**
	 * Shows the app's delivery details above the payment methods on the checkout page.
	 *
	 * @return void
	 */
	public function checkout_summary() {
		if ( ! WC()->session ) {
			return;
		}
		$text = $this->extras_text(
			array(
				'delivery_date' => WC()->session->get( self::SESSION_DELIVERY ),
				'gift_message'  => WC()->session->get( self::SESSION_GIFT ),
			)
		);
		if ( '' !== $text ) {
			echo '<p class="yallapp-delivery">' . nl2br( esc_html( $text ) ) . '</p>';
		}
	}

	/**
	 * Delivery details in the order screen.
	 *
	 * @param WC_Order $order Order.
	 * @return void
	 */
	public function admin_details( $order ) {
		$this->print_details( $order, '<div class="address">', '</div>' );
	}

	/**
	 * Delivery details on the customer's order page.
	 *
	 * @param WC_Order $order Order.
	 * @return void
	 */
	public function customer_details( $order ) {
		$this->print_details( $order, '<section class="yallapp-delivery-details">', '</section>' );
	}

	/**
	 * Delivery details in order emails.
	 *
	 * @param array    $fields        Fields.
	 * @param bool     $sent_to_admin Whether the email goes to the shop.
	 * @param WC_Order $order         Order.
	 * @return array
	 */
	public function email_fields( $fields, $sent_to_admin, $order ) {
		if ( ! $order instanceof WC_Order ) {
			return $fields;
		}
		foreach ( $this->order_details( $order ) as $key => $detail ) {
			$fields[ 'yallapp_' . $key ] = $detail;
		}
		return $fields;
	}

	/**
	 * Checks the delivery date and gift message against the settings.
	 *
	 * @param array $extras delivery_date, gift_message.
	 * @return array|WP_Error Clean values.
	 */
	public function check_extras( array $extras ) {
		$config = $this->config();
		$date   = trim( (string) ( $extras['delivery_date'] ?? '' ) );
		$gift   = trim( sanitize_textarea_field( (string) ( $extras['gift_message'] ?? '' ) ) );
		if ( ! $config['delivery_date']['enabled'] ) {
			$date = '';
		}
		if ( ! $config['gift_message']['enabled'] ) {
			$gift = '';
		}
		if ( '' === $date && $config['delivery_date']['required'] ) {
			return new WP_Error( 'invalid_request', __( 'Choose a delivery date.', 'yallapp' ), array( 'status' => 400 ) );
		}
		if ( '' !== $date ) {
			$day = \DateTimeImmutable::createFromFormat( '!Y-m-d', $date, wp_timezone() );
			if ( ! $day || $day->format( 'Y-m-d' ) !== $date ) {
				return new WP_Error( 'invalid_request', __( 'Choose a valid delivery date.', 'yallapp' ), array( 'status' => 400 ) );
			}
			$today = new \DateTimeImmutable( 'today', wp_timezone() );
			$days  = (int) $today->diff( $day )->format( '%r%a' );
			if ( $days < $config['delivery_date']['min_days'] || $days > $config['delivery_date']['max_days'] || in_array( (int) $day->format( 'w' ), $config['delivery_date']['closed_weekdays'], true ) ) {
				return new WP_Error( 'invalid_request', __( 'We can not deliver on that date. Please choose another day.', 'yallapp' ), array( 'status' => 400 ) );
			}
		}
		if ( function_exists( 'mb_strlen' ) ? mb_strlen( $gift ) > $config['gift_message']['max_length'] : strlen( $gift ) > $config['gift_message']['max_length'] ) {
			return new WP_Error( 'invalid_request', __( 'The gift message is too long.', 'yallapp' ), array( 'status' => 400 ) );
		}
		return array(
			'delivery_date' => '' !== $date ? $date : null,
			'gift_message'  => '' !== $gift ? $gift : null,
		);
	}

	/**
	 * Checks one cart line.
	 *
	 * @param array  $line     CartInput line.
	 * @param string $platform android or ios.
	 * @return array{product: WC_Product|null, name: string, quantity: int, available: bool, problem: string|null, attributes: array, digital_on_ios: bool}
	 */
	private function check_line( array $line, $platform ) {
		$catalog   = new Catalog();
		$parent    = $catalog->product( (int) ( $line['product_id'] ?? 0 ) );
		$quantity  = max( 1, (int) ( $line['quantity'] ?? 1 ) );
		$variation = ! empty( $line['variation_id'] ) ? wc_get_product( (int) $line['variation_id'] ) : null;
		$result    = array(
			'product'        => null,
			'name'           => __( 'Unavailable product', 'yallapp' ),
			'quantity'       => $quantity,
			'available'      => false,
			'problem'        => __( 'This product is no longer available.', 'yallapp' ),
			'attributes'     => array(),
			'digital_on_ios' => false,
		);
		if ( ! $parent || ! ( $parent->is_type( 'simple' ) || $parent->is_type( 'variable' ) ) ) {
			return $result;
		}
		if ( $parent->is_type( 'variable' ) ) {
			if ( ! $variation instanceof WC_Product_Variation || (int) $variation->get_parent_id() !== (int) $parent->get_id() || 'publish' !== get_post_status( $variation->get_id() ) ) {
				$result['product'] = $parent;
				$result['name']    = $parent->get_name();
				$result['problem'] = __( 'Choose the product options.', 'yallapp' );
				return $result;
			}
			$attributes = $this->variation_attributes( $parent, $variation, (array) ( $line['attributes'] ?? array() ) );
			if ( is_wp_error( $attributes ) ) {
				$result['product'] = $variation;
				$result['name']    = $variation->get_name();
				$result['problem'] = $attributes->get_error_message();
				return $result;
			}
			$product              = $variation;
			$result['attributes'] = $attributes;
			$result['name']       = $this->variation_name( $variation, $attributes );
		} else {
			$product        = $parent;
			$result['name'] = $parent->get_name();
		}
		$result['product'] = $product;
		$result['name']    = html_entity_decode( wp_strip_all_tags( (string) $result['name'] ), ENT_QUOTES, 'UTF-8' );
		if ( 'ios' === $platform && Catalog::is_digital( $product ) ) {
			$result['problem']        = __( 'Digital products can be bought on the website.', 'yallapp' );
			$result['digital_on_ios'] = true;
			return $result;
		}
		if ( ! $product->is_purchasable() ) {
			return $result;
		}
		if ( ! $product->is_in_stock() ) {
			$result['problem'] = __( 'This product is out of stock.', 'yallapp' );
			return $result;
		}
		$max = Catalog::max_quantity( $product );
		$min = max( 1, (int) $product->get_min_purchase_quantity() );
		if ( null !== $max && $quantity > $max ) {
			$result['quantity'] = $max;
			/* translators: %d: how many are left. */
			$result['problem'] = sprintf( _n( 'Only %d left in stock.', 'Only %d left in stock.', $max, 'yallapp' ), $max );
		} elseif ( $quantity < $min ) {
			$result['quantity'] = $min;
			/* translators: %d: smallest quantity. */
			$result['problem'] = sprintf( __( 'The smallest quantity is %d.', 'yallapp' ), $min );
		} else {
			$result['problem'] = null;
		}
		$result['available'] = true;
		return $result;
	}

	/**
	 * The variation's attributes for the WooCommerce cart, with the customer's choices for
	 * attributes the variation leaves as "any".
	 *
	 * @param WC_Product           $variable  Variable product.
	 * @param WC_Product_Variation $variation Variation.
	 * @param array                $chosen    Attribute slug => option value.
	 * @return array|WP_Error `attribute_<slug>` => value.
	 */
	private function variation_attributes( WC_Product $variable, WC_Product_Variation $variation, array $chosen ) {
		$options = $variable->get_variation_attributes();
		$values  = array();
		foreach ( $variation->get_variation_attributes() as $key => $value ) {
			$slug = sanitize_title( substr( (string) $key, strlen( 'attribute_' ) ) );
			if ( '' === (string) $value ) {
				$value   = isset( $chosen[ $slug ] ) ? (string) $chosen[ $slug ] : '';
				$allowed = array();
				foreach ( $options as $name => $list ) {
					if ( sanitize_title( (string) $name ) === $slug ) {
						$allowed = array_map( 'strval', (array) $list );
					}
				}
				if ( '' === $value || ! in_array( $value, $allowed, true ) ) {
					return new WP_Error( 'invalid_request', __( 'Choose the product options.', 'yallapp' ) );
				}
			}
			$values[ $key ] = (string) $value;
		}
		return $values;
	}

	/**
	 * Variation name, with the options chosen for "any" attributes.
	 *
	 * @param WC_Product_Variation $variation  Variation.
	 * @param array                $attributes `attribute_<slug>` => value.
	 * @return string
	 */
	private function variation_name( WC_Product_Variation $variation, array $attributes ) {
		$name = (string) $variation->get_name();
		$any  = array();
		foreach ( $variation->get_variation_attributes() as $key => $value ) {
			if ( '' === (string) $value && isset( $attributes[ $key ] ) ) {
				$taxonomy = substr( (string) $key, strlen( 'attribute_' ) );
				$term     = taxonomy_exists( $taxonomy ) ? get_term_by( 'slug', $attributes[ $key ], $taxonomy ) : false;
				$any[]    = $term ? $term->name : $attributes[ $key ];
			}
		}
		return $any ? $name . ' - ' . implode( ', ', $any ) : $name;
	}

	/**
	 * Thumbnail of a product, or of its parent for a variation without its own.
	 *
	 * @param WC_Product $product Product or variation.
	 * @return string|null
	 */
	private static function image( WC_Product $product ) {
		$image_id = $product->get_image_id();
		if ( ! $image_id && $product->get_parent_id() ) {
			$parent   = wc_get_product( $product->get_parent_id() );
			$image_id = $parent ? $parent->get_image_id() : 0;
		}
		$url = $image_id ? wp_get_attachment_image_url( (int) $image_id, 'woocommerce_thumbnail' ) : false;
		return $url ? $url : null;
	}

	/**
	 * The delivery details saved on an order, labelled.
	 *
	 * @param WC_Order $order Order.
	 * @return array<string, array{label: string, value: string}>
	 */
	private function order_details( WC_Order $order ) {
		$details = array();
		$date    = (string) $order->get_meta( self::META_DELIVERY_DATE );
		$gift    = (string) $order->get_meta( self::META_GIFT_MESSAGE );
		if ( '' !== $date ) {
			$details['delivery_date'] = array(
				'label' => __( 'Delivery date', 'yallapp' ),
				'value' => self::format_date( $date ),
			);
		}
		if ( '' !== $gift ) {
			$details['gift_message'] = array(
				'label' => __( 'Gift message', 'yallapp' ),
				'value' => $gift,
			);
		}
		return $details;
	}

	/**
	 * Prints an order's delivery details.
	 *
	 * @param WC_Order $order  Order.
	 * @param string   $before Opening markup.
	 * @param string   $after  Closing markup.
	 * @return void
	 */
	private function print_details( $order, $before, $after ) {
		if ( ! $order instanceof WC_Order ) {
			return;
		}
		$details = $this->order_details( $order );
		if ( ! $details ) {
			return;
		}
		echo wp_kses_post( $before );
		foreach ( $details as $detail ) {
			echo '<p><strong>' . esc_html( $detail['label'] ) . ':</strong><br>' . nl2br( esc_html( $detail['value'] ) ) . '</p>';
		}
		echo wp_kses_post( $after );
	}

	/**
	 * The delivery date and gift message as one line each.
	 *
	 * @param array $extras delivery_date, gift_message.
	 * @return string
	 */
	private function extras_text( array $extras ) {
		$lines = array();
		if ( ! empty( $extras['delivery_date'] ) ) {
			/* translators: %s: delivery date. */
			$lines[] = sprintf( __( 'Delivery date: %s', 'yallapp' ), self::format_date( (string) $extras['delivery_date'] ) );
		}
		if ( ! empty( $extras['gift_message'] ) ) {
			/* translators: %s: gift message. */
			$lines[] = sprintf( __( 'Gift message: %s', 'yallapp' ), (string) $extras['gift_message'] );
		}
		return implode( "\n", $lines );
	}

	/**
	 * A Y-m-d date in the site's date format.
	 *
	 * @param string $date Date.
	 * @return string
	 */
	private static function format_date( $date ) {
		$day = \DateTimeImmutable::createFromFormat( '!Y-m-d', $date, wp_timezone() );
		return $day ? wp_date( (string) get_option( 'date_format' ), $day->getTimestamp() ) : $date;
	}
}
