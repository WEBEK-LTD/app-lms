<?php
/**
 * Sign-in codes sent by Yallapp.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use Yallapp\Crypto;
use Yallapp\License\License_Client;

/**
 * Makes each code on this site and asks yallapp.com.tr to deliver it on WhatsApp
 * (docs/api/platform.yaml, sendSignInCode). Needs an active license and nothing else:
 * no SMS gateway and no Digits REST API add-on.
 *
 * The code is kept only as a hash, for 5 minutes and 5 attempts (Code_Challenge). Accounts
 * are found and stored by the same phone meta as Digits, so people who signed up with Digits
 * keep their accounts, and a site can switch between Yallapp and Digits at any time.
 */
class Yallapp_Adapter extends Digits_Adapter {

	const TRANSIENT       = 'yallapp_code_';
	const LAST_ERROR      = 'yallapp_otp_error';
	const LAST_ERROR_KEEP = DAY_IN_SECONDS;

	/**
	 * License client, which calls the platform.
	 *
	 * @var License_Client
	 */
	private $license;

	/**
	 * Constructor.
	 *
	 * @param License_Client $license License client.
	 */
	public function __construct( License_Client $license ) {
		$this->license = $license;
	}

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'yallapp';
	}

	/**
	 * Whether the license is active on this site: the platform sends codes for active licenses only.
	 *
	 * @return bool
	 */
	public function is_available() {
		return $this->license->has_key() && 'active' === $this->license->status()['status'];
	}

	/**
	 * Makes a code and has Yallapp send it. A new code replaces the previous one only once it was sent.
	 *
	 * @param Phone $phone   Phone number.
	 * @param bool  $sign_up Whether the number has no account yet.
	 * @return true|WP_Error
	 */
	public function send( Phone $phone, $sign_up ) {
		if ( ! $this->is_available() ) {
			$this->remember_error( __( 'Activate your Yallapp license to send sign-in codes.', 'yallapp' ) );
			return new WP_Error( 'provider_unavailable', __( 'Sign-in codes are not available right now. Please try again later.', 'yallapp' ), array( 'status' => 502 ) );
		}
		$code = Code_Challenge::new_code();
		$sent = $this->license->send_code( $phone->e164(), $code );
		if ( is_wp_error( $sent ) ) {
			$data = (array) $sent->get_error_data();
			if ( 'rate_limited' === $sent->get_error_code() ) {
				return new WP_Error(
					'rate_limited',
					__( 'Please wait a moment before requesting another code.', 'yallapp' ),
					array(
						'status'              => 429,
						'retry_after_seconds' => max( 1, (int) ( $data['retry_after_seconds'] ?? 60 ) ),
					)
				);
			}
			$this->remember_error( $sent->get_error_message() );
			return new WP_Error( 'provider_error', __( 'We could not send a code. Please try again.', 'yallapp' ), array( 'status' => 502 ) );
		}
		$now    = time();
		$record = Code_Challenge::record( $phone->e164(), $code, Crypto::secret(), $now );
		set_transient( self::key( $phone ), $record, Code_Challenge::ttl_left( $record, $now ) );
		delete_transient( self::LAST_ERROR );
		return true;
	}

	/**
	 * Checks the code against the one this site made.
	 *
	 * @param Phone  $phone   Phone number.
	 * @param string $code    Code.
	 * @param bool   $sign_up Whether the number has no account yet.
	 * @return true|WP_Error
	 */
	public function verify( Phone $phone, $code, $sign_up ) {
		$key   = self::key( $phone );
		$now   = time();
		$check = Code_Challenge::check( get_transient( $key ), $phone->e164(), (string) $code, Crypto::secret(), $now );
		if ( null === $check['record'] ) {
			delete_transient( $key );
		} else {
			set_transient( $key, $check['record'], Code_Challenge::ttl_left( $check['record'], $now ) );
		}
		switch ( $check['result'] ) {
			case 'ok':
				return true;
			case 'wrong':
				return new WP_Error( 'invalid_code', __( 'That code is not correct.', 'yallapp' ), array( 'status' => 400 ) );
			case 'too_many':
				return new WP_Error( 'code_expired', __( 'Too many wrong codes. Please request a new one.', 'yallapp' ), array( 'status' => 400 ) );
			default:
				return new WP_Error( 'code_expired', __( 'This code has expired. Please request a new one.', 'yallapp' ), array( 'status' => 400 ) );
		}
	}

	/**
	 * The last reason a code couldn't be sent, for the settings page (no phone number or code in it).
	 *
	 * @return array{message: string, at: int}|null
	 */
	public static function last_error() {
		$error = get_transient( self::LAST_ERROR );
		return is_array( $error ) && isset( $error['message'], $error['at'] ) ? $error : null;
	}

	/**
	 * Remembers why a code couldn't be sent.
	 *
	 * @param string $message Message.
	 * @return void
	 */
	private function remember_error( $message ) {
		set_transient(
			self::LAST_ERROR,
			array(
				'message' => sanitize_text_field( (string) $message ),
				'at'      => time(),
			),
			self::LAST_ERROR_KEEP
		);
	}

	/**
	 * Transient key of a number's code: a hash, so the option name holds no number.
	 *
	 * @param Phone $phone Phone number.
	 * @return string
	 */
	private static function key( Phone $phone ) {
		return self::TRANSIENT . substr( Crypto::hash( $phone->e164() ), 0, 40 );
	}
}
