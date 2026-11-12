<?php
/**
 * Course cart routes.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Commerce\Saved_Cards;
use Yallapp\Lms\Course_Cart;
use Yallapp\Lms\Purchase_Rules;

/**
 * 123 /courses/cart, /courses/cart/checkout-link and /me/cards: several courses in one
 * checkout, with a card the student saved on the site.
 */
class Course_Cart_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$auth = array( $this, 'require_user' );
		$this->route(
			'/courses/cart',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'quote' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/courses/cart/checkout-link',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'checkout_link' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/me/cards',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'cards' ),
				'permission_callback' => $auth,
			)
		);
	}

	/**
	 * POST /courses/cart.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function quote( WP_REST_Request $request ) {
		$lms = $this->cart_lms( (string) $request['platform'] );
		if ( $lms instanceof \WP_REST_Response ) {
			return $lms;
		}
		$ids = Course_Cart::ids( $request['course_ids'] );
		if ( is_wp_error( $ids ) ) {
			return self::from_wp_error( $ids );
		}
		$coupon = is_string( $request['coupon'] ) ? $request['coupon'] : null;
		return $this->ok( Course_Cart::quote( $lms, $ids, get_current_user_id(), $coupon ) );
	}

	/**
	 * POST /courses/cart/checkout-link.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function checkout_link( WP_REST_Request $request ) {
		$lms = $this->cart_lms( (string) $request['platform'] );
		if ( $lms instanceof \WP_REST_Response ) {
			return $lms;
		}
		$ids = Course_Cart::ids( $request['course_ids'] );
		if ( is_wp_error( $ids ) ) {
			return self::from_wp_error( $ids );
		}
		$user_id  = get_current_user_id();
		$filled   = array();
		$problems = array();
		foreach ( Course_Cart::rows( $lms, $ids, $user_id ) as $row ) {
			if ( ! $row['available'] ) {
				$problems[] = array(
					'course_id' => $row['course_id'],
					'problem'   => $row['problem'],
				);
				continue;
			}
			$filled[] = array(
				'product_id'   => $row['product_id'],
				'variation_id' => 0,
				'quantity'     => 1,
				'attributes'   => array(),
			);
		}
		if ( $problems ) {
			return self::error( 'cart_changed', __( 'Some courses in your cart changed. Please check your cart.', 'yallapp' ), 409, array( 'details' => array( 'lines' => $problems ) ) );
		}
		$coupon = is_string( $request['coupon'] ) ? wc_format_coupon_code( $request['coupon'] ) : '';
		$card   = Saved_Cards::find( $user_id, (string) $request['card_id'] );
		return $this->ok(
			$this->plugin->store_checkout()->issue(
				$user_id,
				$filled,
				array(
					'delivery_date' => null,
					'gift_message'  => null,
				),
				$coupon,
				$card ? $card->get_id() : 0
			)
		);
	}

	/**
	 * GET /me/cards.
	 *
	 * @return \WP_REST_Response
	 */
	public function cards() {
		return $this->ok( array( 'items' => Saved_Cards::of( get_current_user_id() ) ) );
	}

	/**
	 * The LMS when this platform may buy several courses in one checkout, else the answer why not.
	 *
	 * @param string $platform android or ios.
	 * @return \Yallapp\Lms\Lms_Adapter|\WP_REST_Response
	 */
	private function cart_lms( $platform ) {
		$lms = $this->lms();
		if ( ! $lms instanceof \Yallapp\Lms\Lms_Adapter ) {
			return $lms;
		}
		if ( ! Course_Cart::available( $lms ) ) {
			return self::error( 'not_found', __( 'This academy sells its courses one by one.', 'yallapp' ), 404 );
		}
		// As "Enroll now": never where the app sells through the store, and only where the owner allows it.
		$settings = $this->plugin->settings();
		if ( null !== Billing_Controller::config( $this->plugin, $platform ) || ! Purchase_Rules::enroll_button( $platform, (bool) $settings->get( 'android_enroll_button' ) ) ) {
			return self::error( 'purchase_not_allowed', __( 'Courses can not be bought in the app.', 'yallapp' ), 403 );
		}
		return $lms;
	}
}
