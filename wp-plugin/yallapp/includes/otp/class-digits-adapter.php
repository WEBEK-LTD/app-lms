<?php
/**
 * Digits integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use WP_REST_Request;

/**
 * Sends and checks codes through Digits' own REST routes, so the gateway configured in
 * Digits (SMS or WhatsApp) delivers them. Phone numbers are stored in Digits' user meta.
 *
 * Sites can adapt the calls with the `yallapp_digits_request` filter.
 */
class Digits_Adapter implements Otp_Adapter {

	const META_FULL    = 'digits_phone';
	const META_CC      = 'digt_countrycode';
	const META_NUMBER  = 'digits_phone_no';
	const ROUTE_SEND   = '/digits/v1/send_otp';
	const ROUTE_VERIFY = '/digits/v1/verify_otp';

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'digits';
	}

	/**
	 * Whether Digits' routes are registered.
	 *
	 * @return bool
	 */
	public function is_available() {
		$routes = rest_get_server()->get_routes();
		return isset( $routes[ self::ROUTE_SEND ], $routes[ self::ROUTE_VERIFY ] );
	}

	/**
	 * Sends a code through Digits.
	 *
	 * @param Phone $phone   Phone number.
	 * @param bool  $sign_up Whether the number has no account yet.
	 * @return true|WP_Error
	 */
	public function send( Phone $phone, $sign_up ) {
		return $this->call( self::ROUTE_SEND, $this->params( $phone, $sign_up ) );
	}

	/**
	 * Verifies a code through Digits.
	 *
	 * @param Phone  $phone   Phone number.
	 * @param string $code    Code.
	 * @param bool   $sign_up Whether the number has no account yet.
	 * @return true|WP_Error
	 */
	public function verify( Phone $phone, $code, $sign_up ) {
		return $this->call( self::ROUTE_VERIFY, array_merge( $this->params( $phone, $sign_up ), array( 'otp' => $code ) ) );
	}

	/**
	 * Finds the user by Digits' phone meta.
	 *
	 * @param Phone $phone Phone number.
	 * @return int
	 */
	public function find_user( Phone $phone ) {
		$users = get_users(
			array(
				'meta_key'   => self::META_FULL, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value' => $phone->e164(), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'number'     => 1,
				'fields'     => 'ID',
			)
		);
		if ( $users ) {
			return (int) $users[0];
		}
		$users = get_users(
			array(
				'meta_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => self::META_NUMBER,
						'value' => $phone->number,
					),
					array(
						'key'   => self::META_CC,
						'value' => $phone->country_code,
					),
				),
				'number'     => 1,
				'fields'     => 'ID',
			)
		);
		return $users ? (int) $users[0] : 0;
	}

	/**
	 * Stores the phone in Digits' meta keys.
	 *
	 * @param int   $user_id User ID.
	 * @param Phone $phone   Phone number.
	 * @return void
	 */
	public function attach_phone( $user_id, Phone $phone ) {
		update_user_meta( $user_id, self::META_FULL, $phone->e164() );
		update_user_meta( $user_id, self::META_CC, $phone->country_code );
		update_user_meta( $user_id, self::META_NUMBER, $phone->number );
	}

	/**
	 * Request parameters Digits expects.
	 *
	 * @param Phone $phone   Phone number.
	 * @param bool  $sign_up Whether the number has no account yet.
	 * @return array
	 */
	private function params( Phone $phone, $sign_up ) {
		return array(
			'countrycode' => $phone->country_code,
			'mobileNo'    => $phone->number,
			'type'        => $sign_up ? 'register' : 'login',
		);
	}

	/**
	 * Calls a Digits route internally and reads its result.
	 *
	 * @param string $route  Route path.
	 * @param array  $params Body parameters.
	 * @return true|WP_Error
	 */
	private function call( $route, array $params ) {
		if ( ! $this->is_available() ) {
			return new WP_Error( 'provider_unavailable', __( 'Sign-in codes are not available right now. Please try again later.', 'yallapp' ), array( 'status' => 502 ) );
		}
		/**
		 * Filters the parameters sent to a Digits route.
		 *
		 * @param array  $params Parameters.
		 * @param string $route  Route path.
		 */
		$params  = (array) apply_filters( 'yallapp_digits_request', $params, $route );
		$request = new WP_REST_Request( 'POST', $route );
		$request->set_body_params( $params );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		if ( $response->is_error() || $response->get_status() >= 400 || ! self::is_success( $data ) ) {
			$message = is_array( $data ) && ! empty( $data['message'] ) ? wp_strip_all_tags( (string) $data['message'] ) : '';
			if ( is_array( $data ) && isset( $data['data']['msg'] ) ) {
				$message = wp_strip_all_tags( (string) $data['data']['msg'] );
			}
			$is_verify = self::ROUTE_VERIFY === $route;
			return new WP_Error(
				$is_verify ? 'invalid_code' : 'provider_error',
				'' !== $message ? $message : ( $is_verify ? __( 'That code is not correct.', 'yallapp' ) : __( 'We could not send a code. Please try again.', 'yallapp' ) ),
				array( 'status' => $is_verify ? 400 : 502 )
			);
		}
		return true;
	}

	/**
	 * Whether a Digits response body reports success.
	 *
	 * @param mixed $data Response body.
	 * @return bool
	 */
	private static function is_success( $data ) {
		if ( ! is_array( $data ) ) {
			return true === $data || 1 === $data || '1' === $data;
		}
		if ( array_key_exists( 'success', $data ) ) {
			return (bool) $data['success'];
		}
		if ( array_key_exists( 'code', $data ) ) {
			return in_array( $data['code'], array( 1, '1', 200, '200', 'success' ), true );
		}
		return isset( $data['status'] ) && in_array( $data['status'], array( 'success', 'ok', 1, true ), true );
	}
}
