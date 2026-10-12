<?php
/**
 * Account routes.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Auth\Devices;
use Yallapp\Otp\Sign_In;

/**
 * /me, /me/devices and /me/push-token.
 */
class Account_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$auth = array( $this, 'require_user' );
		$this->route(
			'/me',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_me' ),
					'permission_callback' => $auth,
				),
				array(
					'methods'             => 'PATCH',
					'callback'            => array( $this, 'update_me' ),
					'permission_callback' => $auth,
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_me' ),
					'permission_callback' => $auth,
				),
			)
		);
		$this->route(
			'/me/devices',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'devices' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/me/devices/(?P<device_id>[A-Za-z0-9._:-]{1,64})',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => array( $this, 'remove_device' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/me/push-token',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'push_token' ),
				'permission_callback' => $auth,
				'args'                => array(
					'token' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * GET /me.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_me() {
		return $this->ok( Sign_In::user( get_current_user_id() ) );
	}

	/**
	 * PATCH /me.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function update_me( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$update  = array( 'ID' => $user_id );
		if ( null !== $request['name'] ) {
			$name = sanitize_text_field( (string) $request['name'] );
			if ( '' === $name ) {
				return self::error( 'invalid_request', __( 'Please enter your name.', 'yallapp' ), 400 );
			}
			$update['display_name'] = $name;
			$update['first_name']   = $name;
		}
		if ( null !== $request['email'] ) {
			$email = sanitize_email( (string) $request['email'] );
			if ( '' !== $email && ! is_email( $email ) ) {
				return self::error( 'invalid_request', __( 'Please enter a valid email address.', 'yallapp' ), 400 );
			}
			$owner = $email ? email_exists( $email ) : false;
			if ( $owner && (int) $owner !== $user_id ) {
				return self::error( 'email_exists', __( 'This email is already used by another account.', 'yallapp' ), 400 );
			}
			$update['user_email'] = $email;
		}
		if ( count( $update ) > 1 ) {
			$result = wp_update_user( $update );
			if ( is_wp_error( $result ) ) {
				return self::error( 'invalid_request', $result->get_error_message(), 400 );
			}
		}
		if ( null !== $request['city'] ) {
			update_user_meta( $user_id, Sign_In::USER_META_CITY, sanitize_text_field( (string) $request['city'] ) );
		}
		return $this->ok( Sign_In::user( $user_id ) );
	}

	/**
	 * DELETE /me. Staff accounts are managed on the website.
	 *
	 * @return \WP_REST_Response
	 */
	public function delete_me() {
		$user_id = get_current_user_id();
		if ( user_can( $user_id, 'edit_posts' ) ) {
			return self::error( 'account_managed_by_site', __( 'This account is managed by the academy. Please contact them to delete it.', 'yallapp' ), 403 );
		}
		require_once ABSPATH . 'wp-admin/includes/user.php';
		$this->plugin->devices()->remove_all( $user_id );
		/**
		 * Fires before a student's account is deleted from the app.
		 *
		 * @param int $user_id User ID.
		 */
		do_action( 'yallapp_before_delete_account', $user_id );
		wp_delete_user( $user_id );
		return $this->no_content();
	}

	/**
	 * GET /me/devices.
	 *
	 * @return \WP_REST_Response
	 */
	public function devices() {
		$current = $this->device_row_id();
		$items   = array();
		foreach ( $this->plugin->devices()->for_user( get_current_user_id() ) as $row ) {
			$items[] = Devices::to_api( $row, $current );
		}
		return $this->ok(
			array(
				'items' => $items,
				'limit' => (int) $this->plugin->settings()->get( 'device_limit' ),
			)
		);
	}

	/**
	 * DELETE /me/devices/{device_id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function remove_device( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$row     = $this->plugin->devices()->find( $user_id, (string) $request['device_id'] );
		if ( ! $row ) {
			return self::error( 'not_found', __( 'Device not found.', 'yallapp' ), 404 );
		}
		$this->plugin->devices()->remove( $user_id, (int) $row->id );
		return $this->no_content();
	}

	/**
	 * PUT /me/push-token.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function push_token( WP_REST_Request $request ) {
		$device = $this->device_row_id();
		if ( ! $device ) {
			return self::error( 'invalid_request', __( 'Sign in from the app to receive notifications.', 'yallapp' ), 400 );
		}
		$preferences = array();
		foreach ( array( 'new_lessons', 'announcements', 'daily_reminder' ) as $key ) {
			if ( isset( $request['preferences'][ $key ] ) ) {
				$preferences[ $key ] = (bool) $request['preferences'][ $key ];
			}
		}
		$this->plugin->devices()->set_push( $device, substr( sanitize_text_field( (string) $request['token'] ), 0, 4096 ), $preferences );
		return $this->no_content();
	}
}
