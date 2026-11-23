<?php
/**
 * Store endpoints.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Store\Catalog;
use Yallapp\Store\Paid_Order_Request;
use Yallapp\Store\Paid_Orders;

/**
 * /store/home, /store/categories, /store/products, /store/products/{id}, its reviews,
 * /store/cart and /store/checkout-link, for Store apps on WooCommerce; 134 and Yallapp's
 * `POST /store/paid-orders` for orders paid inside the app.
 */
class Store_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$open = '__return_true';
		$this->route(
			'/store/home',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'home' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/store/categories',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'categories' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/store/products',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'products' ),
				'permission_callback' => $open,
				'args'                => array_merge(
					self::page_args(),
					array(
						'search'    => array( 'type' => 'string' ),
						'category'  => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
						'on_sale'   => array(
							'type'    => 'boolean',
							'default' => false,
						),
						// 209 At this price or under ("Gifts under 100").
						'max_price' => array(
							'type'    => 'number',
							'minimum' => 0,
						),
						'featured'  => array(
							'type'    => 'boolean',
							'default' => false,
						),
						'ids'       => array(
							'type'    => 'string',
							'pattern' => '^[0-9]+(,[0-9]+)*$',
						),
						'orderby'   => array(
							'type'    => 'string',
							'enum'    => Catalog::ORDERS,
							'default' => 'newest',
						),
					)
				),
			)
		);
		$this->route(
			'/store/products/(?P<product_id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'product' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/store/products/(?P<product_id>\d+)/reviews',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'reviews' ),
				'permission_callback' => $open,
				'args'                => self::page_args(),
			)
		);
		$cart_args = array(
			'platform'      => self::platform_arg(),
			// 91.1 A coupon code the customer typed.
			'coupon'        => array(
				'type'      => array( 'string', 'null' ),
				'maxLength' => 50,
			),
			// 131 The delivery day and slot once chosen: the quote adds the slot's fee.
			'delivery_date' => array(
				'type'    => array( 'string', 'null' ),
				'pattern' => '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
			),
			'delivery_slot' => array(
				'type'      => array( 'string', 'null' ),
				'maxLength' => 16,
			),
			'lines'         => array(
				'type'     => 'array',
				'required' => true,
				'minItems' => 1,
				'maxItems' => 100,
				'items'    => array(
					'type'       => 'object',
					'required'   => array( 'product_id', 'quantity' ),
					'properties' => array(
						'product_id'   => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
						'variation_id' => array( 'type' => array( 'integer', 'null' ) ),
						'quantity'     => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 9999,
						),
						'attributes'   => array(
							'type'                 => 'object',
							'additionalProperties' => array( 'type' => 'string' ),
						),
						// 131 A gift add-on's line: the product of the line it goes with.
						'addon_of'     => array( 'type' => array( 'integer', 'null' ) ),
					),
				),
			),
		);
		$this->route(
			'/store/cart',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'cart' ),
				'permission_callback' => $open,
				'args'                => $cart_args,
			)
		);
		$this->route(
			'/store/checkout-link',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'checkout_link' ),
				'permission_callback' => $open,
				'args'                => array_merge(
					$cart_args,
					array(
						'delivery_date'  => array(
							'type'    => array( 'string', 'null' ),
							'pattern' => '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
						),
						'gift_message'   => array(
							'type'      => array( 'string', 'null' ),
							'maxLength' => 500,
						),
						// 131 The slot, "send anonymously", the sender and the recipient (checked by Delivery_Rules).
						'delivery_slot'  => array(
							'type'      => array( 'string', 'null' ),
							'maxLength' => 16,
						),
						'gift_anonymous' => array( 'type' => 'boolean' ),
						'sender'         => array( 'type' => array( 'object', 'null' ) ),
						'recipient'      => array( 'type' => array( 'object', 'null' ) ),
						// 134 The app pays inside the app when the store does (StoreConfig.checkout_payment).
						'payment'        => array(
							'type' => 'string',
							'enum' => array( 'platform', 'in_app' ),
						),
					)
				),
			)
		);
		// 134 Yallapp prices an order paid inside the app, then creates it once the payment is verified.
		$this->route(
			'/store/paid-orders',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'paid_orders' ),
				// The signature is the permission: checked in the callback so errors keep the contract's shape.
				'permission_callback' => $open,
			)
		);
		// 131 The delivery slots of a day, the card messages, the flash sale and the coupons shown in the app.
		$this->route(
			'/store/delivery-slots',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'delivery_slots' ),
				'permission_callback' => $open,
				'args'                => array(
					'date' => array(
						'type'     => 'string',
						'required' => true,
						'pattern'  => '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
					),
				),
			)
		);
		$this->route(
			'/store/gift-messages',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'gift_messages' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/store/flash-sales',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'flash_sales' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/store/coupons',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'coupons' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/store/addons',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'addons' ),
				'permission_callback' => $open,
				'args'                => array(
					'product_id' => array(
						'type'    => 'integer',
						'minimum' => 1,
					),
				),
			)
		);
	}

	/**
	 * 131 GET /store/addons: the gift add-ons offered with a product.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function addons( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		$catalog = new Catalog();
		$id      = (int) $request['product_id'];
		$main    = $id ? $catalog->product( $id ) : null;
		if ( $id && ( ! $main || Catalog::is_addon( $main ) ) ) {
			return self::error( 'not_found', __( 'Product not found.', 'yallapp' ), 404 );
		}
		return $this->ok( array( 'items' => $catalog->addons( $main ) ) );
	}

	/**
	 * 131 GET /store/delivery-slots.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function delivery_slots( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		$slots = $this->plugin->store_extras()->slots( $this->plugin->store_checkout()->config(), (string) $request['date'] );
		return null === $slots ? self::error( 'not_found', __( 'This shop has no delivery days.', 'yallapp' ), 404 ) : $this->ok( $slots );
	}

	/**
	 * 131 GET /store/gift-messages, in the app's language.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function gift_messages( WP_REST_Request $request ) {
		$language = strtolower( substr( (string) $request->get_header( 'accept_language' ), 0, 2 ) );
		return $this->ok( $this->plugin->store_extras()->gift_messages( preg_match( '/^[a-z]{2}$/', $language ) ? $language : '' ) );
	}

	/**
	 * 131 GET /store/flash-sales, its title in the app's language.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function flash_sales( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		$language = strtolower( substr( (string) $request->get_header( 'accept_language' ), 0, 2 ) );
		return $this->ok( $this->plugin->store_extras()->flash_sales( new Catalog(), preg_match( '/^[a-z]{2}$/', $language ) ? $language : '' ) );
	}

	/**
	 * 131 GET /store/coupons.
	 *
	 * @return \WP_REST_Response
	 */
	public function coupons() {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		return $this->ok( \Yallapp\Store\Store_Extras::coupons() );
	}

	/**
	 * GET /store/home.
	 *
	 * @return \WP_REST_Response
	 */
	public function home() {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		$settings = $this->plugin->settings();
		$catalog  = new Catalog();
		$sections = array();
		$titles   = array(
			'featured_products' => __( 'Featured', 'yallapp' ),
			'sale_products'     => __( 'On sale', 'yallapp' ),
			'new_products'      => __( 'New arrivals', 'yallapp' ),
			'best_sellers'      => __( 'Best sellers', 'yallapp' ),
		);
		foreach ( (array) $settings->get( 'store_home_sections' ) as $type ) {
			if ( 'banner' === $type ) {
				$image_id = (int) $settings->get( 'store_banner_image_id' );
				$image    = $image_id ? wp_get_attachment_url( $image_id ) : false;
				if ( $image ) {
					$product    = (int) $settings->get( 'store_banner_product_id' );
					$category   = (int) $settings->get( 'store_banner_category_id' );
					$sections[] = array(
						'type'   => 'banner',
						'title'  => null,
						'banner' => array(
							'image_url'        => $image,
							'link_product_id'  => $product && $catalog->product( $product ) ? $product : null,
							'link_category_id' => $category && term_exists( $category, 'product_cat' ) ? $category : null,
						),
					);
				}
				continue;
			}
			if ( 'categories' === $type ) {
				$categories = array_values(
					array_filter(
						$catalog->categories(),
						static function ( $category ) {
							return null === $category['parent_id'];
						}
					)
				);
				if ( $categories ) {
					$sections[] = array(
						'type'       => 'categories',
						'title'      => __( 'Categories', 'yallapp' ),
						'categories' => $categories,
					);
				}
				continue;
			}
			if ( ! isset( $titles[ $type ] ) ) {
				continue;
			}
			if ( 'best_sellers' === $type ) {
				$products = $catalog->best_sellers( 10 );
			} else {
				$products = $catalog->products(
					array(
						'per_page' => 10,
						'featured' => 'featured_products' === $type,
						'on_sale'  => 'sale_products' === $type,
					)
				)['items'];
			}
			if ( $products ) {
				$sections[] = array(
					'type'     => $type,
					'title'    => $titles[ $type ],
					'products' => $products,
				);
			}
		}
		return $this->ok( array( 'sections' => $sections ) );
	}

	/**
	 * GET /store/categories.
	 *
	 * @return \WP_REST_Response
	 */
	public function categories() {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		return $this->ok( array( 'items' => ( new Catalog() )->categories() ) );
	}

	/**
	 * GET /store/products.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function products( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		$ids    = (string) $request['ids'];
		$result = ( new Catalog() )->products(
			array(
				'page'     => (int) $request['page'],
				'per_page' => (int) $request['per_page'],
				'search'   => (string) $request['search'],
				'category' => (int) $request['category'],
				'on_sale'  => (bool) $request['on_sale'],
				'featured' => (bool) $request['featured'],
				'ids'      => '' !== $ids ? explode( ',', $ids ) : array(),
				'orderby'  => (string) $request['orderby'],
			) + self::listing_filters( $request )
		);
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
	}

	/**
	 * 212 The listing filters asked for: `size`, `colour`, `f.<key>`, `min_price`, `max_price`. Pure.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return array
	 */
	public static function listing_filters( WP_REST_Request $request ) {
		$filters = array();
		foreach ( (array) $request->get_query_params() as $key => $value ) {
			if ( ! is_string( $value ) || '' === $value ) {
				continue;
			}
			if ( 'size' === $key || 'colour' === $key || 'color' === $key ) {
				$filters[ 'color' === $key ? 'colour' : $key ] = $value;
			} elseif ( 0 === strpos( (string) $key, 'f.' ) || 0 === strpos( (string) $key, 'f_' ) ) {
				$filters[ sanitize_key( substr( (string) $key, 2 ) ) ] = $value;
			}
		}
		$out = $filters ? array( 'filters' => $filters ) : array();
		foreach ( array( 'min_price', 'max_price' ) as $key ) {
			$value = $request->get_param( $key );
			if ( is_numeric( $value ) && (float) $value >= 0 ) {
				$out[ $key ] = (float) $value;
			}
		}
		return $out;
	}

	/**
	 * GET /store/products/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function product( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		$catalog = new Catalog();
		$product = $catalog->product( (int) $request['product_id'] );
		if ( ! $product ) {
			return self::error( 'not_found', __( 'Product not found.', 'yallapp' ), 404 );
		}
		return $this->ok( $catalog->detail( $product ) );
	}

	/**
	 * GET /store/products/{id}/reviews.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function reviews( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		$catalog = new Catalog();
		$product = $catalog->product( (int) $request['product_id'] );
		if ( ! $product ) {
			return self::error( 'not_found', __( 'Product not found.', 'yallapp' ), 404 );
		}
		if ( ! Catalog::reviews_enabled( $product ) ) {
			return self::error( 'feature_disabled', __( 'Reviews are turned off for this product.', 'yallapp' ), 403 );
		}
		$result = $catalog->reviews( $product, get_current_user_id(), (int) $request['page'], (int) $request['per_page'] );
		return $this->ok(
			array_merge(
				self::page_meta( $request, $result['total'] ),
				array(
					'items'   => $result['items'],
					'summary' => $result['summary'],
				)
			)
		);
	}

	/**
	 * POST /store/cart.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function cart( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		return $this->result(
			$this->plugin->store_checkout()->quote(
				(array) $request['lines'],
				(string) $request['platform'],
				$request['coupon'],
				array(
					'delivery_date' => $request['delivery_date'],
					'delivery_slot' => $request['delivery_slot'],
				)
			)
		);
	}

	/**
	 * POST /store/checkout-link.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function checkout_link( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		return $this->result(
			$this->plugin->store_checkout()->link(
				get_current_user_id(),
				(array) $request['lines'],
				(string) $request['platform'],
				array(
					'delivery_date'  => $request['delivery_date'],
					'gift_message'   => $request['gift_message'],
					'coupon'         => $request['coupon'],
					'delivery_slot'  => $request['delivery_slot'],
					'gift_anonymous' => true === $request['gift_anonymous'],
					'sender'         => is_array( $request['sender'] ) ? $request['sender'] : null,
					'recipient'      => is_array( $request['recipient'] ) ? $request['recipient'] : null,
					'payment'        => 'in_app' === $request['payment'] ? 'in_app' : ( null !== $request['payment'] ? 'platform' : null ),
				)
			)
		);
	}

	/**
	 * 134 POST /store/paid-orders: Yallapp, signed with the license key, prices an order paid inside
	 * the app (`quote`) or creates it once paid (`create`, one per payment reference).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function paid_orders( WP_REST_Request $request ) {
		$key = (string) $this->plugin->settings()->get( 'license_key' );
		$raw = $request->get_body();
		if ( ! Paid_Order_Request::verify( $key, $request->get_header( 'yallapp_timestamp' ), $request->get_header( 'yallapp_signature' ), $raw, time() ) ) {
			return self::error( 'invalid_signature', __( 'This request is not signed for this site.', 'yallapp' ), 401 );
		}
		$order = Paid_Order_Request::parse( json_decode( (string) $raw, true ) );
		if ( null === $order ) {
			return self::error( 'invalid_request', __( 'The request is not a valid order.', 'yallapp' ), 400 );
		}
		if ( ! Catalog::available() ) {
			return self::unavailable();
		}
		// Yallapp may hang up on a slow site; the order is still made, and kept by its reference.
		ignore_user_abort( true );
		return $this->result( ( new Paid_Orders() )->handle( $order ) );
	}

	/**
	 * The error for sites without WooCommerce.
	 *
	 * @return \WP_REST_Response
	 */
	private static function unavailable() {
		return self::error( 'store_unavailable', __( 'The shop is not available right now.', 'yallapp' ), 503 );
	}
}
