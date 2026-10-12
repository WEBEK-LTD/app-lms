<?php
/**
 * Local development provider.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

/**
 * Accepts the code 123456 without sending anything. Only used when the site defines
 * YALLAPP_DEV_OTP and runs in a local or development environment.
 */
class Dev_Adapter extends Digits_Adapter {

	const CODE = '123456';

	/**
	 * Whether this site may use the development provider.
	 *
	 * @return bool
	 */
	public static function allowed() {
		return defined( 'YALLAPP_DEV_OTP' ) && YALLAPP_DEV_OTP && in_array( wp_get_environment_type(), array( 'local', 'development' ), true );
	}

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'dev';
	}

	/**
	 * Always available where allowed.
	 *
	 * @return bool
	 */
	public function is_available() {
		return self::allowed();
	}

	/**
	 * Pretends to send.
	 *
	 * @param Phone $phone   Phone number.
	 * @param bool  $sign_up Whether the number has no account yet.
	 * @return true
	 */
	public function send( Phone $phone, $sign_up ) {
		return true;
	}

	/**
	 * Accepts the fixed development code.
	 *
	 * @param Phone  $phone   Phone number.
	 * @param string $code    Code.
	 * @param bool   $sign_up Whether the number has no account yet.
	 * @return true|\WP_Error
	 */
	public function verify( Phone $phone, $code, $sign_up ) {
		return hash_equals( self::CODE, (string) $code ) ? true : new \WP_Error( 'invalid_code', __( 'That code is not correct.', 'yallapp' ), array( 'status' => 400 ) );
	}
}
