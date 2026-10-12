<?php
/**
 * One-time code provider.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

use WP_Error;

/**
 * Sends and verifies sign-in codes, and links phone numbers to WordPress users.
 */
interface Otp_Adapter {

	/**
	 * Machine name, for diagnostics.
	 *
	 * @return string
	 */
	public function id();

	/**
	 * Whether the provider can send codes on this site.
	 *
	 * @return bool
	 */
	public function is_available();

	/**
	 * Sends a code.
	 *
	 * @param Phone $phone   Phone number.
	 * @param bool  $sign_up Whether the number has no account yet.
	 * @return true|WP_Error
	 */
	public function send( Phone $phone, $sign_up );

	/**
	 * Verifies a code.
	 *
	 * @param Phone  $phone   Phone number.
	 * @param string $code    Code typed by the student.
	 * @param bool   $sign_up Whether the number has no account yet.
	 * @return true|WP_Error
	 */
	public function verify( Phone $phone, $code, $sign_up );

	/**
	 * The user who owns a phone number.
	 *
	 * @param Phone $phone Phone number.
	 * @return int User ID, or 0.
	 */
	public function find_user( Phone $phone );

	/**
	 * Stores a phone number on a user the way the provider expects, so the website sign-in works too.
	 *
	 * @param int   $user_id User ID.
	 * @param Phone $phone   Phone number.
	 * @return void
	 */
	public function attach_phone( $user_id, Phone $phone );
}
