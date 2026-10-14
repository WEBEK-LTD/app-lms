<?php
/**
 * Sign-in codes by email, sent by Yallapp.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use Yallapp\Crypto;
use Yallapp\License\License_Client;

/**
 * Email sign-in with a code: makes each code on this site, like phone codes (6 digits, kept only
 * as a hash with the site secret, 5 minutes, 5 attempts: Code_Challenge), and asks
 * yallapp.com.tr to email it (docs/api/platform.yaml, sendSignInCode with `channel: email`),
 * from the app owner's own email server when they set one, else from Yallapp's address. Needs
 * an active license. On a local site with development codes, nothing is sent and 123456 works.
 */
class Email_Codes {

	const TRANSIENT = 'yallapp_email_code_';

	/**
	 * License client, which calls the platform.
	 *
	 * @var License_Client
	 */
	private $license;

	/**
	 * Whether development codes are on (Settings › Sign-in, local sites only).
	 *
	 * @var bool
	 */
	private $dev;

	/**
	 * Constructor.
	 *
	 * @param License_Client $license License client.
	 * @param bool           $dev     Development codes: nothing is sent and 123456 works.
	 */
	public function __construct( License_Client $license, $dev = false ) {
		$this->license = $license;
		$this->dev     = (bool) $dev && Dev_Adapter::allowed();
	}

	/**
	 * Whether codes can be emailed: an active license, or development codes.
	 *
	 * @return bool
	 */
	public function is_available() {
		return $this->dev || ( $this->license->has_key() && 'active' === $this->license->status()['status'] );
	}

	/**
	 * Makes a code and has Yallapp email it. A new code replaces the previous one only once it was sent.
	 *
	 * @param string $email Email address (lowercase).
	 * @return true|WP_Error
	 */
	public function send( $email ) {
		if ( $this->dev ) {
			return true;
		}
		if ( ! $this->is_available() ) {
			return new WP_Error( 'provider_unavailable', __( 'Sign-in codes are not available right now. Please try again later.', 'yallapp' ), array( 'status' => 502 ) );
		}
		$code = Code_Challenge::new_code();
		$sent = $this->license->send_email_code( $email, $code );
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
			return new WP_Error( 'provider_error', __( 'We could not send a code. Please try again.', 'yallapp' ), array( 'status' => 502 ) );
		}
		$now    = time();
		$record = Code_Challenge::record( self::subject( $email ), $code, Crypto::secret(), $now );
		set_transient( self::key( $email ), $record, Code_Challenge::ttl_left( $record, $now ) );
		return true;
	}

	/**
	 * Checks the code against the one this site made for this address.
	 *
	 * @param string $email Email address (lowercase).
	 * @param string $code  Code.
	 * @return true|WP_Error
	 */
	public function verify( $email, $code ) {
		if ( $this->dev ) {
			return hash_equals( Dev_Adapter::CODE, (string) $code ) ? true : new WP_Error( 'invalid_code', __( 'That code is not correct.', 'yallapp' ), array( 'status' => 400 ) );
		}
		$key   = self::key( $email );
		$now   = time();
		$check = Code_Challenge::check( get_transient( $key ), self::subject( $email ), (string) $code, Crypto::secret(), $now );
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
	 * What the code's hash is bound to: never the same as a phone number's.
	 *
	 * @param string $email Email address.
	 * @return string
	 */
	public static function subject( $email ) {
		return 'email:' . strtolower( trim( (string) $email ) );
	}

	/**
	 * Transient key of an address's code: a hash, so the option name holds no address.
	 *
	 * @param string $email Email address.
	 * @return string
	 */
	private static function key( $email ) {
		return self::TRANSIENT . substr( Crypto::hash( self::subject( $email ) ), 0, 40 );
	}
}
