<?php
/**
 * Sign-in routes.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Content\Magic_Links;
use Yallapp\Lms\Purchase_Rules;

/**
 * /auth/* routes.
 */
class Auth_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$device = array(
			'type'     => 'object',
			'required' => true,
		);
		$this->route(
			'/auth/otp/request',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'request_code' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'country_code' => array(
						'type'     => 'string',
						'required' => true,
					),
					'phone'        => array(
						'type'     => 'string',
						'required' => true,
					),
					'preview'      => array(
						'type'     => 'boolean',
						'required' => false,
					),
				),
			)
		);
		$this->route(
			'/auth/otp/verify',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'verify_code' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'request_id' => array(
						'type'     => 'string',
						'required' => true,
					),
					'code'       => array(
						'type'     => 'string',
						'required' => true,
					),
					'device'     => $device,
				),
			)
		);
		$this->route(
			'/auth/email/request',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'request_email_code' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'email'   => array(
						'type'     => 'string',
						'required' => true,
					),
					'preview' => array(
						'type'     => 'boolean',
						'required' => false,
					),
				),
			)
		);
		$this->route(
			'/auth/password',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'password' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'email'    => array(
						'type'     => 'string',
						'required' => true,
					),
					'password' => array(
						'type'     => 'string',
						'required' => true,
					),
					'device'   => $device,
					'preview'  => array(
						'type'     => 'boolean',
						'required' => false,
					),
				),
			)
		);
		$this->route(
			'/auth/register',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'register' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'signup_token' => array(
						'type'     => 'string',
						'required' => true,
					),
					'name'         => array(
						'type'     => 'string',
						'required' => true,
					),
					'device'       => $device,
				),
			)
		);
		$this->route(
			'/auth/refresh',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'refresh' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'refresh_token' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);
		$this->route(
			'/auth/logout',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'logout' ),
				'permission_callback' => array( $this, 'require_user' ),
			)
		);
		$this->route(
			'/auth/checkout-link',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'checkout_link' ),
				'permission_callback' => array( $this, 'require_user' ),
				'args'                => array(
					'platform'  => self::platform_arg(),
					'course_id' => array(
						'type'     => 'integer',
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * POST /auth/otp/request.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function request_code( WP_REST_Request $request ) {
		// The app preview in the Yallapp dashboard signs in only the store review number.
		$preview = true === $request['preview'];
		return $this->result( $this->plugin->sign_in()->request( (string) $request['country_code'], (string) $request['phone'], $preview ) );
	}

	/**
	 * POST /auth/email/request: a code by email, when email sign-in works with a code.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function request_email_code( WP_REST_Request $request ) {
		return $this->result( $this->plugin->sign_in()->request_email( (string) $request['email'], true === $request['preview'] ) );
	}

	/**
	 * POST /auth/otp/verify.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function verify_code( WP_REST_Request $request ) {
		return $this->result( $this->plugin->sign_in()->verify( (string) $request['request_id'], (string) $request['code'], (array) $request['device'] ) );
	}

	/**
	 * POST /auth/password: email (or username) and password of a WordPress account.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function password( WP_REST_Request $request ) {
		return $this->result( $this->plugin->sign_in()->password( (string) $request['email'], (string) $request['password'], (array) $request['device'], true === $request['preview'] ) );
	}

	/**
	 * POST /auth/register.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function register( WP_REST_Request $request ) {
		$fields = array(
			'name'  => $request['name'],
			'email' => $request['email'],
			'city'  => $request['city'],
		);
		return $this->result( $this->plugin->sign_in()->register( (string) $request['signup_token'], $fields, (array) $request['device'] ), 201 );
	}

	/**
	 * POST /auth/refresh.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function refresh( WP_REST_Request $request ) {
		return $this->result( $this->plugin->tokens()->rotate( (string) $request['refresh_token'] ) );
	}

	/**
	 * POST /auth/logout: signs this device out.
	 *
	 * @return \WP_REST_Response
	 */
	public function logout() {
		$device = $this->device_row_id();
		if ( $device ) {
			$this->plugin->devices()->remove( get_current_user_id(), $device );
		}
		return $this->no_content();
	}

	/**
	 * POST /auth/checkout-link.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function checkout_link( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof \Yallapp\Lms\Lms_Adapter ) {
			return $lms;
		}
		$settings  = $this->plugin->settings();
		$course_id = (int) $request['course_id'];
		$course    = $lms->course( $course_id, get_current_user_id() );
		if ( ! $course ) {
			return self::error( 'not_found', __( 'Course not found.', 'yallapp' ), 404 );
		}
		$action = Purchase_Rules::action(
			$course['enrolled'],
			$course['price']['is_free'],
			(string) $request['platform'],
			(bool) $settings->get( 'free_enrollment' ),
			(bool) $settings->get( 'android_enroll_button' ),
			(bool) $course['has_checkout']
		);
		// 100.4 Where the app sells through the store on this platform, never the website's checkout.
		if ( null !== Billing_Controller::config( $this->plugin, (string) $request['platform'] ) && ! $course['enrolled'] && ! $course['price']['is_free'] ) {
			$action = 'none';
		}
		if ( 'checkout' !== $action ) {
			return self::error( 'purchase_not_allowed', __( 'This course can not be bought in the app.', 'yallapp' ), 403 );
		}
		$opens_in = (string) $settings->get( 'checkout_opens_in' );
		$url      = Magic_Links::create( get_current_user_id(), $lms->checkout_url( $course_id ), 'in_app' === $opens_in && (bool) $settings->get( 'hide_site_chrome_in_app' ) );
		return $this->ok(
			array(
				'url'        => $url,
				'expires_at' => gmdate( 'c', time() + Magic_Links::TTL ),
				'open_in'    => $opens_in,
			)
		);
	}
}
