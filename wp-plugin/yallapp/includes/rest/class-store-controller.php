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

/**
 * /store/home, /store/categories, /store/products, /store/products/{id}, its reviews,
 * /store/cart and /store/checkout-link, for Store apps on WooCommerce.
 */
class Store_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		// Public, as the shop is on the website: guests browse, price a cart and check out. A
		// checkout link carries the signed-in customer only when the request has their token.
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
						'search'   => array( 'type' => 'string' ),
						'category' => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
						'on_sale'  => array(
							'type'    => 'boolean',
							'default' => false,
						),
						'featured' => array(
							'type'    => 'boolean',
							'default' => false,
						),
						'ids'      => array(
							'type'    => 'string',
							'pattern' => '^[0-9]+(,[0-9]+)*$',
						),
						'orderby'  => array(
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
			'platform' => self::platform_arg(),
			// 91.1 A coupon code the customer typed.
			'coupon'   => array(
				'type'      => array( 'string', 'null' ),
				'maxLength' => 50,
			),
			'lines'    => array(
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
						'delivery_date' => array(
							'type'    => array( 'string', 'null' ),
							'pattern' => '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
						),
						'gift_message'  => array(
							'type'      => array( 'string', 'null' ),
							'maxLength' => 500,
						),
					)
				),
			)
		);
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
			)
		);
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
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
		return $this->ok( $this->plugin->store_checkout()->quote( (array) $request['lines'], (string) $request['platform'], $request['coupon'] ) );
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
					'delivery_date' => $request['delivery_date'],
					'gift_message'  => $request['gift_message'],
					'coupon'        => $request['coupon'],
				)
			)
		);
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
