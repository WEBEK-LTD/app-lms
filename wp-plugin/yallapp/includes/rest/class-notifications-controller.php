<?php
/**
 * Notifications inbox and orders.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Lms\Lms_Adapter;

/**
 * /me/notifications, /me/notifications/read and /me/orders.
 */
class Notifications_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$auth = array( $this, 'require_user' );
		$this->route(
			'/me/notifications',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'notifications' ),
				'permission_callback' => $auth,
				'args'                => self::page_args(),
			)
		);
		$this->route(
			'/me/notifications/read',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'mark_read' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/me/orders',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'orders' ),
				'permission_callback' => $auth,
				'args'                => self::page_args(),
			)
		);
	}

	/**
	 * GET /me/notifications.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function notifications( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$result  = $this->plugin->inbox()->for_user( $user_id, $this->course_ids( $user_id ), (int) $request['page'], (int) $request['per_page'] );
		return $this->ok(
			array_merge(
				self::page_meta( $request, $result['total'] ),
				array(
					'items'        => $result['items'],
					'unread_count' => $result['unread'],
				)
			)
		);
	}

	/**
	 * POST /me/notifications/read.
	 *
	 * @return \WP_REST_Response
	 */
	public function mark_read() {
		$user_id = get_current_user_id();
		$this->plugin->inbox()->mark_read( $user_id, $this->course_ids( $user_id ) );
		return $this->no_content();
	}

	/**
	 * GET /me/orders.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function orders( WP_REST_Request $request ) {
		$lms = $this->plugin->lms();
		if ( $lms && $lms->sells_courses() ) {
			$result = $lms->orders( get_current_user_id(), (int) $request['page'], (int) $request['per_page'] );
		} elseif ( ! $lms ) {
			// A Store app: the customer's WooCommerce orders.
			$result = \Yallapp\Commerce\Woo_Orders::for_user(
				get_current_user_id(),
				(int) $request['page'],
				(int) $request['per_page'],
				static function () {
					return 0;
				}
			);
		} else {
			$result = array(
				'items' => array(),
				'total' => 0,
			);
		}
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
	}

	/**
	 * Courses whose notifications the student gets.
	 *
	 * @param int $user_id Student.
	 * @return int[]
	 */
	private function course_ids( $user_id ) {
		$lms = $this->plugin->lms();
		return $lms instanceof Lms_Adapter ? $lms->enrolled_course_ids( $user_id ) : array();
	}
}
