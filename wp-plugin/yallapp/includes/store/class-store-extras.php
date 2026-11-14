<?php
/**
 * 131 The flower shop on WooCommerce: delivery days and slots, the gift checkout, card
 * messages, flash sales and the coupons shown in the app.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

use WC_Order;
use WC_Product;
use Yallapp\Commerce\Money;
use Yallapp\Settings;

/**
 * What a Store app on WooCommerce gets beside its products:
 *
 * - same-day delivery until a cut-off and the delivery slots (Settings › Yallapp ›
 *   Store), each with an optional capacity (counted from the site's orders) and fee (a
 *   fee line on WooCommerce's checkout);
 * - the gift checkout (the setting, or the flower shop's look in Studio): the sender
 *   fills the order's billing details, the recipient its shipping details, both kept as
 *   order meta too;
 * - the card messages the owner manages in the Yallapp dashboard (license status);
 * - a flash sale through WooCommerce's own sale price: while it is on, the products in
 *   it cost the sale price everywhere (the shop, the cart, the checkout), for as many
 *   units as it has; WooCommerce's own scheduled sale prices show their end too;
 * - WooCommerce coupons ticked "Show in the app".
 */
class Store_Extras {

	const META_SLOT       = '_yallapp_delivery_slot';
	const META_SLOT_LABEL = '_yallapp_delivery_slot_label';
	const META_SENDER     = '_yallapp_sender';
	const META_RECIPIENT  = '_yallapp_recipient';
	const META_ANONYMOUS  = '_yallapp_gift_anonymous';
	const META_FLASH_ITEM = '_yallapp_flash_sale';
	const META_COUNTED    = '_yallapp_flash_counted';
	const META_IN_APP     = '_yallapp_in_app';
	const SOLD_OPTION     = 'yallapp_flash_sold';

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * The license status's Studio screens and card messages.
	 *
	 * @var callable
	 */
	private $status;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings.
	 * @param callable $status   fn(): array The license status.
	 */
	public function __construct( Settings $settings, $status ) {
		$this->settings = $settings;
		$this->status   = $status;
	}

	/**
	 * Hooks into WooCommerce.
	 *
	 * @return void
	 */
	public function register() {
		// The flash sale's price, as WooCommerce's own sale price.
		foreach ( array( 'woocommerce_product_get_price', 'woocommerce_product_get_sale_price', 'woocommerce_product_variation_get_price', 'woocommerce_product_variation_get_sale_price' ) as $hook ) {
			add_filter( $hook, array( $this, 'flash_price_filter' ), 20, 2 );
		}
		add_filter( 'woocommerce_variation_prices_price', array( $this, 'flash_price_filter' ), 20, 2 );
		add_filter( 'woocommerce_variation_prices_sale_price', array( $this, 'flash_price_filter' ), 20, 2 );
		add_filter( 'woocommerce_get_variation_prices_hash', array( $this, 'variation_prices_hash' ) );
		add_filter( 'woocommerce_product_is_on_sale', array( $this, 'flash_on_sale' ), 20, 2 );
		add_action( 'woocommerce_checkout_create_order_line_item', array( $this, 'mark_flash_item' ), 10, 3 );
		add_action( 'woocommerce_order_status_processing', array( $this, 'count_flash_units' ) );
		add_action( 'woocommerce_order_status_completed', array( $this, 'count_flash_units' ) );
		// "Show in the app" on a coupon.
		add_action( 'woocommerce_coupon_options', array( $this, 'coupon_option' ), 10, 2 );
		add_action( 'woocommerce_coupon_options_save', array( $this, 'save_coupon_option' ) );
		// 131 "Sell only as an add-on in the app" on WooCommerce's product screen.
		add_action( 'woocommerce_product_options_general_product_data', array( $this, 'addon_fields' ) );
		add_action( 'woocommerce_admin_process_product_object', array( $this, 'save_addon_fields' ) );
	}

	/**
	 * 131 The gift add-on's fields on WooCommerce's product screen (General).
	 *
	 * @return void
	 */
	public function addon_fields() {
		global $post;
		$id   = $post ? (int) $post->ID : 0;
		$on   = 'yes' === get_post_meta( $id, Addon_Rules::META_ADDON, true );
		$rule = Catalog::addon_rule( $id );
		echo '<div class="options_group yallapp-addon">';
		woocommerce_wp_checkbox(
			array(
				'id'          => 'yallapp_addon',
				'label'       => __( 'Sell only as an add-on in the app', 'yallapp' ),
				'description' => __( 'A gift extra, like chocolates, a card or a vase: the Yallapp app never lists it on its own or sells it alone, and offers it as "Add a little more" with the products below. Your website\'s shop keeps showing it unless you hide it there (Catalog visibility).', 'yallapp' ),
				'value'       => $on ? 'yes' : 'no',
			)
		);
		woocommerce_wp_select(
			array(
				'id'      => 'yallapp_addon_offer',
				'label'   => __( 'Offer it with', 'yallapp' ),
				'value'   => $rule['offer_with'],
				'options' => array(
					'all'        => __( 'Every product', 'yallapp' ),
					'categories' => __( 'The products of some categories', 'yallapp' ),
					'products'   => __( 'Some products', 'yallapp' ),
				),
			)
		);
		woocommerce_wp_text_input(
			array(
				'id'          => 'yallapp_addon_categories',
				'label'       => __( 'Their category IDs', 'yallapp' ),
				'description' => __( 'For "The products of some categories", separated by commas.', 'yallapp' ),
				'desc_tip'    => true,
				'value'       => implode( ', ', $rule['category_ids'] ),
			)
		);
		woocommerce_wp_text_input(
			array(
				'id'          => 'yallapp_addon_products',
				'label'       => __( 'Their product IDs', 'yallapp' ),
				'description' => __( 'For "Some products", separated by commas.', 'yallapp' ),
				'desc_tip'    => true,
				'value'       => implode( ', ', $rule['product_ids'] ),
			)
		);
		echo '</div>';
	}

	/**
	 * 131 Saves the gift add-on's fields.
	 *
	 * @param WC_Product $product The product being saved.
	 * @return void
	 */
	public function save_addon_fields( $product ) {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- WooCommerce checked the product form's nonce.
		$on         = isset( $_POST['yallapp_addon'] ) && 'yes' === sanitize_text_field( wp_unslash( $_POST['yallapp_addon'] ) );
		$offer      = isset( $_POST['yallapp_addon_offer'] ) ? sanitize_key( wp_unslash( $_POST['yallapp_addon_offer'] ) ) : 'all';
		$categories = isset( $_POST['yallapp_addon_categories'] ) ? sanitize_text_field( wp_unslash( $_POST['yallapp_addon_categories'] ) ) : '';
		$products   = isset( $_POST['yallapp_addon_products'] ) ? sanitize_text_field( wp_unslash( $_POST['yallapp_addon_products'] ) ) : '';
		// phpcs:enable
		if ( ! $product instanceof WC_Product ) {
			return;
		}
		if ( ! $on ) {
			foreach ( array( Addon_Rules::META_ADDON, Addon_Rules::META_OFFER, Addon_Rules::META_CATEGORIES, Addon_Rules::META_PRODUCTS ) as $key ) {
				$product->delete_meta_data( $key );
			}
			return;
		}
		$rule = Addon_Rules::rule( $offer, $categories, $products );
		$product->update_meta_data( Addon_Rules::META_ADDON, 'yes' );
		$product->update_meta_data( Addon_Rules::META_OFFER, $rule['offer_with'] );
		$product->update_meta_data( Addon_Rules::META_CATEGORIES, implode( ',', $rule['category_ids'] ) );
		$product->update_meta_data( Addon_Rules::META_PRODUCTS, implode( ',', $rule['product_ids'] ) );
	}

	/**
	 * The site's time zone now.
	 *
	 * @return \DateTimeImmutable
	 */
	public static function now() {
		return new \DateTimeImmutable( 'now', wp_timezone() );
	}

	/**
	 * The gift checkout: the setting, or the Studio look's `mode: gift`.
	 *
	 * @return bool
	 */
	public function gift_checkout() {
		if ( 'gift' === $this->settings->get( 'store_checkout_mode' ) ) {
			return true;
		}
		$status = (array) call_user_func( $this->status );
		return 'gift' === ( $status['screens']['checkout']['mode'] ?? null );
	}

	/**
	 * StoreConfig's delivery_date with the cut-off, the time zone and the slots (fees as numbers).
	 *
	 * @param array $base The delivery date as before.
	 * @return array
	 */
	public function delivery_rules( array $base ) {
		$gift  = $this->gift_checkout();
		$slots = Delivery_Rules::parse_slots( (string) $this->settings->get( 'store_delivery_slots' ) );
		if ( $gift && ! $slots ) {
			$slots = Delivery_Rules::parse_slots( "10:00-13:00\n13:00-16:00\n16:00-20:00" );
		}
		$cutoff = (string) $this->settings->get( 'store_delivery_cutoff' );
		return array_merge(
			$base,
			array(
				// The gift checkout always asks for the day and the slot.
				'enabled'         => $base['enabled'] || $gift,
				'required'        => $base['required'] || $gift,
				'max_days'        => $gift && ! $base['enabled'] ? 14 : $base['max_days'],
				'timezone'        => function_exists( 'wp_timezone_string' ) ? wp_timezone_string() : 'UTC',
				'same_day_cutoff' => 0 === (int) $base['min_days'] && preg_match( '/^([01][0-9]|2[0-3]):[0-5][0-9]$/', $cutoff ) ? $cutoff : null,
				'slots'           => $slots,
			)
		);
	}

	/**
	 * StoreConfig's additions.
	 *
	 * @param array $config The store config as before.
	 * @return array
	 */
	public function config( array $config ) {
		$gift                    = $this->gift_checkout();
		$rules                   = $this->delivery_rules( $config['delivery_date'] );
		$rules['slots']          = array_map(
			static function ( $slot ) {
				return Delivery_Rules::slot_json( $slot, array( self::class, 'money' ) );
			},
			$rules['slots']
		);
		$config['checkout_mode'] = $gift ? 'gift' : 'standard';
		$config['delivery_date'] = $rules;
		$starters                = array_values( array_filter( array_map( array( Delivery_Rules::class, 'line' ), preg_split( '/[\r\n]+/', (string) $this->settings->get( 'store_gift_starters' ) ) ) ) );
		$config['gift_message']  = array(
			'enabled'    => $config['gift_message']['enabled'] || $gift,
			'max_length' => $gift && ! $config['gift_message']['enabled'] ? Delivery_Rules::MAX_MESSAGE : $config['gift_message']['max_length'],
			'starters'   => array_slice( $starters, 0, 6 ),
			'recipient'  => (bool) $this->settings->get( 'store_gift_recipient' ) || $gift,
			'anonymous'  => (bool) $this->settings->get( 'store_gift_anonymous' ) || $gift,
		);
		// 131 The owner's titles of the add-ons, the card and the delivery picker (the Yallapp dashboard's).
		$status           = (array) call_user_func( $this->status );
		$config['titles'] = Addon_Rules::titles( $status['store_titles'] ?? null );
		return $config;
	}

	/**
	 * A price as the shop shows it, without markup.
	 *
	 * @param float $amount Amount.
	 * @return string
	 */
	public static function money( $amount ) {
		return Money::plain( wc_price( (float) $amount ) );
	}

	/**
	 * The site's orders for a delivery day, by slot: paid, on hold, or still being paid
	 * (made in the last hour).
	 *
	 * @param string $date Y-m-d.
	 * @return array<string, int>
	 */
	public static function slot_counts( $date ) {
		$counts = array();
		$orders = wc_get_orders(
			array(
				'limit'      => 500,
				'status'     => array( 'wc-processing', 'wc-completed', 'wc-on-hold', 'wc-pending' ),
				'meta_key'   => Checkout::META_DELIVERY_DATE, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- One day's orders.
				'meta_value' => (string) $date, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- One day's orders.
			)
		);
		foreach ( $orders as $order ) {
			if ( ! $order instanceof WC_Order ) {
				continue;
			}
			$created = $order->get_date_created();
			if ( 'pending' === $order->get_status() && $created && $created->getTimestamp() < time() - HOUR_IN_SECONDS ) {
				continue;
			}
			$slot            = (string) $order->get_meta( self::META_SLOT );
			$counts[ $slot ] = ( $counts[ $slot ] ?? 0 ) + 1;
		}
		return $counts;
	}

	/**
	 * GET /store/delivery-slots.
	 *
	 * @param array  $config The store config.
	 * @param string $date   Y-m-d.
	 * @return array|null Null when the shop has no delivery days.
	 */
	public function slots( array $config, $date ) {
		$rules = $this->delivery_rules( $config['delivery_date'] );
		if ( empty( $rules['enabled'] ) ) {
			return null;
		}
		return Delivery_Rules::slots_json( $rules, $date, self::now(), self::slot_counts( $date ), array( self::class, 'money' ) );
	}

	/**
	 * GET /store/gift-messages, in the app's language.
	 *
	 * @param string $language Language code.
	 * @return array
	 */
	public function gift_messages( $language ) {
		$status = (array) call_user_func( $this->status );
		return Delivery_Rules::gift_messages( $status['gift_messages'] ?? null, $language );
	}

	// Flash sale.

	/**
	 * The flash sale in the settings, with its units sold.
	 *
	 * @return array{enabled: bool, title: string, product_ids: int[], category_id: int, kind: string, value: float, starts: int, ends: int, limit: int, sold: int, key: string}
	 */
	public function flash() {
		$zone = wp_timezone();
		$time = static function ( $value ) use ( $zone ) {
			$at = \DateTimeImmutable::createFromFormat( 'Y-m-d\TH:i', (string) $value, $zone );
			return $at ? $at->getTimestamp() : 0;
		};
		$sale = array(
			'enabled'     => (bool) $this->settings->get( 'store_flash_sale' ),
			'title'       => (string) $this->settings->get( 'store_flash_title' ),
			'titles'      => Addon_Rules::lang_lines( (string) $this->settings->get( 'store_flash_titles' ) ),
			'product_ids' => array_map( 'intval', (array) $this->settings->get( 'store_flash_product_ids' ) ),
			'category_id' => (int) $this->settings->get( 'store_flash_category_id' ),
			'kind'        => 'price' === $this->settings->get( 'store_flash_kind' ) ? 'price' : 'percent',
			'value'       => (float) str_replace( ',', '.', (string) $this->settings->get( 'store_flash_value' ) ),
			'starts'      => $time( $this->settings->get( 'store_flash_starts' ) ),
			'ends'        => $time( $this->settings->get( 'store_flash_ends' ) ),
			'limit'       => (int) $this->settings->get( 'store_flash_limit' ),
		);
		// The units sold count for this sale only: a changed sale starts again.
		$sale['key']  = md5( (string) wp_json_encode( array( $sale['product_ids'], $sale['category_id'], $sale['kind'], $sale['value'], $sale['starts'], $sale['ends'], $sale['limit'] ) ) );
		$sold         = get_option( self::SOLD_OPTION, array() );
		$sale['sold'] = is_array( $sold ) && ( $sold['key'] ?? '' ) === $sale['key'] ? (int) ( $sold['units'] ?? 0 ) : 0;
		if ( 'percent' === $sale['kind'] && ( $sale['value'] < 1 || $sale['value'] > 90 ) ) {
			$sale['enabled'] = false;
		}
		return $sale;
	}

	/**
	 * Whether the flash sale is on now and has a product (a variation through its parent).
	 *
	 * @param WC_Product $product Product.
	 * @param array|null $sale    The sale, or null to read it.
	 * @return bool
	 */
	public function flash_covers( WC_Product $product, $sale = null ) {
		$sale = $sale ? $sale : $this->flash();
		if ( ! Delivery_Rules::flash_on( $sale, time() ) ) {
			return false;
		}
		$id = $product->get_parent_id() ? (int) $product->get_parent_id() : (int) $product->get_id();
		// 131 A sale on one product is on that one only; a category's on its products.
		return Delivery_Rules::flash_covers( $sale, $id, $sale['category_id'] > 0 && has_term( $sale['category_id'], 'product_cat', $id ) );
	}

	/**
	 * The products in the flash sale while it is on (a category's too), for `on_sale` lists.
	 *
	 * @return int[]
	 */
	public function flash_product_ids() {
		$sale = $this->flash();
		if ( ! Delivery_Rules::flash_on( $sale, time() ) ) {
			return array();
		}
		$ids = $sale['product_ids'];
		if ( $sale['category_id'] > 0 ) {
			$ids = array_merge(
				$ids,
				array_map(
					'intval',
					(array) get_posts(
						array(
							'post_type'      => 'product',
							'post_status'    => 'publish',
							'fields'         => 'ids',
							'posts_per_page' => 200, // phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_posts_per_page -- One category's products on sale.
							'tax_query'      => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- One category.
								array(
									'taxonomy' => 'product_cat',
									'field'    => 'term_id',
									'terms'    => $sale['category_id'],
								),
							),
						)
					)
				)
			);
		}
		return array_values( array_unique( $ids ) );
	}

	/**
	 * WooCommerce's price and sale price while the flash sale is on.
	 *
	 * @param mixed      $price   The price WooCommerce has.
	 * @param WC_Product $product Product.
	 * @return mixed
	 */
	public function flash_price_filter( $price, $product ) {
		static $busy = false;
		if ( $busy || ! $product instanceof WC_Product || ! $this->flash_covers( $product ) ) {
			return $price;
		}
		$busy    = true;
		$regular = (float) $product->get_regular_price( 'edit' );
		$busy    = false;
		$flash   = Delivery_Rules::flash_price( $this->flash(), $regular );
		if ( null === $flash ) {
			return $price;
		}
		return '' === (string) $price || (float) $price > $flash ? (string) $flash : $price;
	}

	/**
	 * A variable product's price cache knows about the flash sale.
	 *
	 * @param array $hash Hash parts.
	 * @return array
	 */
	public function variation_prices_hash( $hash ) {
		$sale   = $this->flash();
		$hash[] = Delivery_Rules::flash_on( $sale, time() ) ? $sale['key'] : 'no-flash';
		return $hash;
	}

	/**
	 * On sale while the flash sale has it.
	 *
	 * @param bool       $on_sale WooCommerce's answer.
	 * @param WC_Product $product Product.
	 * @return bool
	 */
	public function flash_on_sale( $on_sale, $product ) {
		return $on_sale || ( $product instanceof WC_Product && $this->flash_covers( $product ) );
	}

	/**
	 * Marks an order line bought at the flash sale's price.
	 *
	 * @param \WC_Order_Item_Product $item          Line.
	 * @param string                 $cart_item_key Cart key.
	 * @param array                  $values        Cart values.
	 * @return void
	 */
	public function mark_flash_item( $item, $cart_item_key, $values ) {
		unset( $cart_item_key );
		$product = $values['data'] ?? null;
		if ( $product instanceof WC_Product && $this->flash_covers( $product ) ) {
			$item->add_meta_data( self::META_FLASH_ITEM, $this->flash()['key'], true );
		}
		// 131 A gift add-on from the app: the product it went with.
		if ( ! empty( $values['yallapp_addon_of'] ) ) {
			$item->add_meta_data( Addon_Rules::META_ADDON_OF, (int) $values['yallapp_addon_of'], true );
		}
	}

	/**
	 * Counts a paid order's units bought at the flash sale's price, once.
	 *
	 * @param int $order_id Order.
	 * @return void
	 */
	public function count_flash_units( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof WC_Order || $order->get_meta( self::META_COUNTED ) ) {
			return;
		}
		$sale  = $this->flash();
		$units = 0;
		foreach ( $order->get_items() as $item ) {
			if ( $item->get_meta( self::META_FLASH_ITEM ) === $sale['key'] ) {
				$units += (int) $item->get_quantity();
			}
		}
		$order->update_meta_data( self::META_COUNTED, '1' );
		$order->save();
		if ( $units > 0 ) {
			update_option(
				self::SOLD_OPTION,
				array(
					'key'   => $sale['key'],
					'units' => $sale['sold'] + $units,
				),
				false
			);
		}
	}

	/**
	 * ProductSale of a product: the flash sale's, else WooCommerce's own sale price (with
	 * its scheduled end); null when it isn't on sale.
	 *
	 * @param WC_Product $product Product.
	 * @param array      $price   ProductPrice.
	 * @return array|null
	 */
	public function sale( WC_Product $product, array $price ) {
		if ( ! empty( $price['range'] ) || empty( $price['on_sale'] ) || null === $price['regular_amount'] ) {
			return null;
		}
		$was  = (float) $price['regular_amount'];
		$now  = (float) $price['amount'];
		$sale = $this->flash();
		if ( $this->flash_covers( $product, $sale ) ) {
			$left = $sale['limit'] > 0 ? $sale['limit'] - $sale['sold'] : null;
			return Delivery_Rules::sale_json( $was, $now, $sale['ends'], $left, $sale['limit'] > 0 ? $sale['limit'] : null, $sale['starts'], array( self::class, 'money' ), 1 );
		}
		$ends  = $product->get_date_on_sale_to();
		$stock = $product->managing_stock() ? (int) $product->get_stock_quantity() : null;
		return Delivery_Rules::sale_json( $was, $now, $ends ? $ends->getTimestamp() : null, $stock, null, null, array( self::class, 'money' ) );
	}

	/**
	 * GET /store/flash-sales: the plugin's flash sale while it is on or starts within a day.
	 *
	 * @param Catalog $catalog  Catalog.
	 * @param string  $language 131 The app's language, for the sale's title in it.
	 * @return array
	 */
	public function flash_sales( Catalog $catalog, $language = '' ) {
		$sale = $this->flash();
		$now  = time();
		if ( ! $sale['enabled'] || $sale['ends'] <= $now || $sale['starts'] > $now + DAY_IN_SECONDS || ( $sale['limit'] > 0 && $sale['sold'] >= $sale['limit'] ) ) {
			return array( 'items' => array() );
		}
		$args     = $sale['product_ids'] ? array(
			'ids'      => $sale['product_ids'],
			'per_page' => min( 24, count( $sale['product_ids'] ) ),
		) : array(
			'category' => $sale['category_id'],
			'per_page' => 24,
		);
		$products = $catalog->products( $args )['items'];
		return array(
			'items' => array(
				array(
					'id'          => 1,
					'title'       => $sale['titles'][ $language ] ?? ( '' !== $sale['title'] ? $sale['title'] : __( 'Flash sale', 'yallapp' ) ),
					'titles'      => $sale['titles'],
					'starts_at'   => gmdate( 'Y-m-d\TH:i:s\Z', $sale['starts'] ),
					'ends_at'     => gmdate( 'Y-m-d\TH:i:s\Z', $sale['ends'] ),
					'live'        => Delivery_Rules::flash_on( $sale, $now ),
					'percent_off' => 'percent' === $sale['kind'] ? (int) $sale['value'] : null,
					'remaining'   => $sale['limit'] > 0 ? max( 0, $sale['limit'] - $sale['sold'] ) : null,
					'total'       => $sale['limit'] > 0 ? $sale['limit'] : null,
					'products'    => array_values( $products ),
				),
			),
		);
	}

	// Coupons shown in the app.

	/**
	 * "Show in the app" on WooCommerce's coupon screen.
	 *
	 * @param int        $coupon_id Coupon.
	 * @param \WC_Coupon $coupon    Coupon.
	 * @return void
	 */
	public function coupon_option( $coupon_id, $coupon ) {
		unset( $coupon );
		woocommerce_wp_checkbox(
			array(
				'id'          => 'yallapp_in_app',
				'label'       => __( 'Show in the app', 'yallapp' ),
				'description' => __( 'On the coupon element of the app\'s pages, while it is valid.', 'yallapp' ),
				'value'       => get_post_meta( (int) $coupon_id, self::META_IN_APP, true ) ? 'yes' : 'no',
			)
		);
	}

	/**
	 * Saves "Show in the app".
	 *
	 * @param int $coupon_id Coupon.
	 * @return void
	 */
	public function save_coupon_option( $coupon_id ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WooCommerce checked the coupon form's nonce.
		$on = isset( $_POST['yallapp_in_app'] ) && 'yes' === sanitize_text_field( wp_unslash( $_POST['yallapp_in_app'] ) );
		if ( $on ) {
			update_post_meta( (int) $coupon_id, self::META_IN_APP, '1' );
		} else {
			delete_post_meta( (int) $coupon_id, self::META_IN_APP );
		}
	}

	/**
	 * GET /store/coupons: coupons shown in the app that are valid now (PublicCoupon).
	 *
	 * @return array
	 */
	public static function coupons() {
		$items = array();
		$posts = get_posts(
			array(
				'post_type'      => 'shop_coupon',
				'post_status'    => 'publish',
				'posts_per_page' => 20,
				'meta_key'       => self::META_IN_APP, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- The few coupons shown in the app.
				'meta_value'     => '1', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- The few coupons shown in the app.
			)
		);
		foreach ( $posts as $post ) {
			$coupon  = new \WC_Coupon( $post->ID );
			$expires = $coupon->get_date_expires();
			$limit   = (int) $coupon->get_usage_limit();
			if ( ( $expires && $expires->getTimestamp() <= time() ) || ( $limit > 0 && (int) $coupon->get_usage_count() >= $limit ) ) {
				continue;
			}
			$percent = 'percent' === $coupon->get_discount_type();
			$amount  = (float) $coupon->get_amount();
			$minimum = (float) $coupon->get_minimum_amount();
			$items[] = array(
				'code'                 => strtoupper( (string) $coupon->get_code() ),
				'kind'                 => $percent ? 'percent' : 'amount',
				'percent_off'          => $percent ? (int) round( $amount ) : null,
				'amount_off'           => $percent ? null : number_format( $amount, 2, '.', '' ),
				'amount_off_formatted' => $percent ? null : self::money( $amount ),
				'min_order'            => $minimum > 0 ? number_format( $minimum, 2, '.', '' ) : null,
				'min_order_formatted'  => $minimum > 0 ? self::money( $minimum ) : null,
				'starts_at'            => null,
				'ends_at'              => $expires ? gmdate( 'Y-m-d\TH:i:s\Z', $expires->getTimestamp() ) : null,
				'remaining'            => $limit > 0 ? max( 0, $limit - (int) $coupon->get_usage_count() ) : null,
			);
		}
		return array( 'items' => $items );
	}
}
