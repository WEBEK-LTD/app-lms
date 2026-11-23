<?php
/**
 * 212 Store endpoints: the wishlist, writing a review, back in stock and the listing filters.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Store\Catalog;
use Yallapp\Store\Shop_Features;

/**
 * `/store/wishlist`, `/store/products/{id}/reviews/mine`, `/store/products/{id}/back-in-stock`,
 * `/store/back-in-stock` and `/store/filters` (docs/api/openapi.yaml), for Store apps on WooCommerce.
 */
class Shop_Features_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$user = array( $this, 'require_user' );
		$this->route(
			'/store/wishlist',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'wishlist' ),
				'permission_callback' => $user,
				'args'                => self::page_args(),
			)
		);
		$this->route(
			'/store/wishlist/merge',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'merge' ),
				'permission_callback' => $user,
				'args'                => array(
					'product_ids' => array(
						'type'     => 'array',
						'required' => true,
						'maxItems' => 200,
						'items'    => array( 'type' => 'integer' ),
					),
				),
			)
		);
		$this->route(
			'/store/wishlist/(?P<product_id>\d+)',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'save' ),
					'permission_callback' => $user,
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'unsave' ),
					'permission_callback' => $user,
				),
			)
		);
		$this->route(
			'/store/products/(?P<product_id>\d+)/reviews/mine',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'review' ),
					'permission_callback' => $user,
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_review' ),
					'permission_callback' => $user,
				),
			)
		);
		$this->route(
			'/store/products/(?P<product_id>\d+)/back-in-stock',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'wait' ),
					'permission_callback' => $user,
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'stop_waiting' ),
					'permission_callback' => $user,
				),
			)
		);
		$this->route(
			'/store/back-in-stock',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'waiting' ),
				'permission_callback' => $user,
			)
		);
		$this->route(
			'/store/filters',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'filters' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'category' => array(
						'type'    => 'integer',
						'minimum' => 1,
					),
				),
			)
		);
	}

	/**
	 * GET /store/wishlist.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function wishlist( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::error( 'feature_disabled', __( 'The shop is not available.', 'yallapp' ), 503 );
		}
		$ids      = Shop_Features::wishlist( get_current_user_id() );
		$per_page = max( 1, (int) $request['per_page'] );
		$page     = max( 1, (int) $request['page'] );
		$slice    = array_slice( $ids, ( $page - 1 ) * $per_page, $per_page );
		$items    = $slice ? ( new Catalog() )->products(
			array(
				'ids'      => $slice,
				'per_page' => count( $slice ),
			)
		)['items'] : array();
		return $this->ok(
			array_merge(
				self::page_meta( $request, count( $ids ) ),
				array(
					'ids'   => $ids,
					'items' => $items,
				)
			)
		);
	}

	/**
	 * POST /store/wishlist/merge.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function merge( WP_REST_Request $request ) {
		return $this->ok( array( 'ids' => Shop_Features::merge_wishlist( get_current_user_id(), (array) $request['product_ids'] ) ) );
	}

	/**
	 * PUT /store/wishlist/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function save( WP_REST_Request $request ) {
		$id = (int) $request['product_id'];
		if ( ! Catalog::available() || ! ( new Catalog() )->product( $id ) ) {
			return self::error( 'not_found', __( 'Product not found.', 'yallapp' ), 404 );
		}
		if ( ! Shop_Features::add_to_wishlist( get_current_user_id(), $id ) ) {
			return self::error( 'wishlist_full', __( 'Your wishlist holds up to 200 products. Remove some first.', 'yallapp' ), 409 );
		}
		return new \WP_REST_Response( null, 204 );
	}

	/**
	 * DELETE /store/wishlist/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function unsave( WP_REST_Request $request ) {
		Shop_Features::remove_from_wishlist( get_current_user_id(), (int) $request['product_id'] );
		return new \WP_REST_Response( null, 204 );
	}

	/**
	 * PUT /store/products/{id}/reviews/mine: only from a customer who bought it.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function review( WP_REST_Request $request ) {
		$id      = (int) $request['product_id'];
		$product = Catalog::available() ? ( new Catalog() )->product( $id ) : null;
		if ( ! $product ) {
			return self::error( 'not_found', __( 'Product not found.', 'yallapp' ), 404 );
		}
		if ( ! Catalog::reviews_enabled( $product ) ) {
			return self::error( 'feature_disabled', __( 'Reviews are turned off for this product.', 'yallapp' ), 403 );
		}
		$user_id = get_current_user_id();
		if ( ! Shop_Features::bought( $user_id, $id ) ) {
			return self::error( 'not_bought', __( 'Only customers who bought this product can review it.', 'yallapp' ), 403 );
		}
		$read = Shop_Features::read_review( $request->get_param( 'rating' ), $request->get_param( 'text' ) );
		if ( ! $read['ok'] ) {
			return self::error( 'invalid_request', $read['error'], 400 );
		}
		$review_id = Shop_Features::save_review( $user_id, $id, $read['rating'], $read['text'] );
		$row       = get_comment( $review_id );
		return $this->ok(
			array(
				'id'         => $review_id,
				'rating'     => $read['rating'],
				'text'       => $read['text'],
				'author'     => array(
					'name'       => Shop_Features::short_name( wp_get_current_user()->display_name ),
					'avatar_url' => null,
					'instructor' => false,
				),
				'created_at' => $row ? mysql2date( 'Y-m-d\TH:i:s\Z', $row->comment_date_gmt, false ) : gmdate( 'Y-m-d\TH:i:s\Z' ),
				'status'     => $row && '1' === (string) $row->comment_approved ? 'approved' : 'pending',
				'mine'       => true,
			)
		);
	}

	/**
	 * DELETE /store/products/{id}/reviews/mine.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function delete_review( WP_REST_Request $request ) {
		$own = Shop_Features::own_review( get_current_user_id(), (int) $request['product_id'] );
		if ( $own ) {
			wp_delete_comment( (int) $own->comment_ID, true );
		}
		return new \WP_REST_Response( null, 204 );
	}

	/**
	 * PUT /store/products/{id}/back-in-stock.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function wait( WP_REST_Request $request ) {
		$id        = (int) $request['product_id'];
		$product   = Catalog::available() ? ( new Catalog() )->product( $id ) : null;
		$variation = (int) $request->get_param( 'variation_id' );
		if ( ! $product ) {
			return self::error( 'not_found', __( 'Product not found.', 'yallapp' ), 404 );
		}
		$target = $product;
		if ( $variation ) {
			$target = wc_get_product( $variation );
			if ( ! $target || (int) $target->get_parent_id() !== $id ) {
				return self::error( 'not_found', __( 'This choice is not sold.', 'yallapp' ), 404 );
			}
		}
		if ( $target->is_in_stock() ) {
			return self::error( 'in_stock', __( "It's in stock now: add it to your cart.", 'yallapp' ), 409 );
		}
		if ( ! Shop_Features::wait( get_current_user_id(), $id, $variation, $product->get_name() ) ) {
			return self::error( 'too_many', __( 'You can wait for up to 50 products at once.', 'yallapp' ), 409 );
		}
		return $this->ok(
			array(
				'product_id'   => $id,
				'variation_id' => $variation ? $variation : null,
				'waiting'      => true,
			)
		);
	}

	/**
	 * DELETE /store/products/{id}/back-in-stock.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function stop_waiting( WP_REST_Request $request ) {
		Shop_Features::stop_waiting( get_current_user_id(), (int) $request['product_id'], (int) $request->get_param( 'variation_id' ) );
		return new \WP_REST_Response( null, 204 );
	}

	/**
	 * GET /store/back-in-stock.
	 *
	 * @return \WP_REST_Response
	 */
	public function waiting() {
		$items = array();
		foreach ( Shop_Features::waiting( get_current_user_id() ) as $w ) {
			$items[] = array(
				'product_id'   => $w['product_id'],
				'variation_id' => $w['variation_id'] ? $w['variation_id'] : null,
				'name'         => $w['name'],
				'created_at'   => '' !== $w['created_at'] ? $w['created_at'] : gmdate( 'Y-m-d\TH:i:s\Z' ),
			);
		}
		return $this->ok( array( 'items' => $items ) );
	}

	/**
	 * GET /store/filters.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function filters( WP_REST_Request $request ) {
		if ( ! Catalog::available() ) {
			return self::error( 'not_found', __( 'Not found.', 'yallapp' ), 404 );
		}
		return $this->ok( Shop_Features::filters( (int) $request['category'] ) );
	}
}
