<?php
/**
 * Sign-in with a one-time code.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use Yallapp\Auth\Devices;
use Yallapp\Auth\Rate_Limiter;
use Yallapp\Auth\Tokens;
use Yallapp\Crypto;
use Yallapp\License\License_Client;
use Yallapp\Settings;

/**
 * The sign-in flow: request a code, verify it, and sign in or sign up.
 */
class Sign_In {

	const REQUEST_TTL          = 600;
	const SIGNUP_TTL           = 900;
	const MAX_ATTEMPTS         = 5;
	const IP_LIMIT_PER_H       = 30;
	const CODE_LENGTH          = 6;
	const CODE_EXPIRES_IN      = 300;
	const USER_META_CITY       = 'yallapp_city';
	const USER_META_SOURCE     = 'yallapp_signed_up_in_app';
	const PASSWORD_IP_LIMIT    = 20;
	const PASSWORD_LOGIN_LIMIT = 5;
	const PASSWORD_WINDOW      = 900;

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Code provider.
	 *
	 * @var Otp_Adapter
	 */
	private $otp;

	/**
	 * Devices.
	 *
	 * @var Devices
	 */
	private $devices;

	/**
	 * Tokens.
	 *
	 * @var Tokens
	 */
	private $tokens;

	/**
	 * License client, for the sign-in methods the app's owner chose on the Yallapp dashboard.
	 *
	 * @var License_Client|null
	 */
	private $license;

	/**
	 * Constructor.
	 *
	 * @param Settings            $settings Settings.
	 * @param Otp_Adapter         $otp      Code provider.
	 * @param Devices             $devices  Devices.
	 * @param Tokens              $tokens   Tokens.
	 * @param License_Client|null $license  License client.
	 */
	public function __construct( Settings $settings, Otp_Adapter $otp, Devices $devices, Tokens $tokens, $license = null ) {
		$this->settings = $settings;
		$this->otp      = $otp;
		$this->devices  = $devices;
		$this->tokens   = $tokens;
		$this->license  = $license instanceof License_Client ? $license : null;
	}

	/**
	 * How people sign in: the owner's choice on the Yallapp dashboard, else the plugin setting.
	 *
	 * @return string[] `phone` and/or `email`.
	 */
	public function methods() {
		$platform = $this->license && $this->license->has_key() ? ( $this->license->status()['sign_in_methods'] ?? null ) : null;
		return Methods::resolve( $platform, (string) $this->settings->get( 'sign_in_methods' ) );
	}

	/**
	 * Signs in with the email address (or username) and password of a WordPress account. WordPress
	 * checks them (wp_authenticate), so the site's own rules and security plugins apply. Only
	 * existing accounts sign in; a wrong address and a wrong password get the same answer.
	 *
	 * @param string $login    Email address or username.
	 * @param string $password Password.
	 * @param array  $device   DeviceInput.
	 * @param bool   $preview  The app preview in the Yallapp dashboard asks.
	 * @return array|WP_Error Session.
	 */
	public function password( $login, $password, array $device, $preview = false ) {
		if ( $preview ) {
			return new WP_Error(
				'preview_review_number_only',
				__( 'This is a preview. Sign in with the store review number and code set in the Yallapp plugin\'s settings.', 'yallapp' ),
				array( 'status' => 403 )
			);
		}
		if ( ! in_array( Methods::EMAIL, $this->methods(), true ) ) {
			return new WP_Error( 'method_not_allowed', __( 'This app doesn\'t offer sign-in by email. Sign in with your phone number.', 'yallapp' ), array( 'status' => 403 ) );
		}
		$login    = trim( (string) $login );
		$password = (string) $password;
		$wrong    = new WP_Error( 'invalid_credentials', __( 'The email or password is not correct.', 'yallapp' ), array( 'status' => 400 ) );
		if ( '' === $login || '' === $password || strlen( $login ) > 191 || strlen( $password ) > 4096 ) {
			return $wrong;
		}
		$bucket = 'password|' . strtolower( $login );
		$wait   = Rate_Limiter::hit( 'password-ip|' . Rate_Limiter::client_ip(), self::PASSWORD_IP_LIMIT, self::PASSWORD_WINDOW );
		if ( ! $wait ) {
			$wait = Rate_Limiter::hit( $bucket, self::PASSWORD_LOGIN_LIMIT, self::PASSWORD_WINDOW );
		}
		if ( $wait ) {
			return new WP_Error(
				'rate_limited',
				__( 'Too many attempts. Please wait a few minutes and try again.', 'yallapp' ),
				array(
					'status'              => 429,
					'retry_after_seconds' => (int) $wait,
				)
			);
		}
		$user = wp_authenticate( $login, $password );
		if ( is_wp_error( $user ) || ! $user instanceof \WP_User ) {
			// About as slow for an address with no account as for a wrong password.
			if ( ! get_user_by( 'email', $login ) && ! get_user_by( 'login', $login ) ) {
				wp_hash_password( $password );
			}
			return $wrong;
		}
		Rate_Limiter::clear( $bucket );
		return $this->session( (int) $user->ID, $device );
	}

	/**
	 * Sends a code to a phone number.
	 *
	 * @param string $country_code Country code.
	 * @param string $number       National number.
	 * @param bool   $preview      The app preview in the Yallapp dashboard asks: it never sends a code, so only the store review number signs in.
	 * @return array|WP_Error
	 */
	public function request( $country_code, $number, $preview = false ) {
		$phone = Phone::parse( $country_code, $number );
		if ( ! $phone ) {
			return new WP_Error( 'invalid_phone', __( 'Please enter a valid mobile number.', 'yallapp' ), array( 'status' => 400 ) );
		}
		if ( $preview && ! $this->is_review_phone( $phone ) ) {
			return new WP_Error(
				'preview_review_number_only',
				__( 'This is a preview, and it never sends codes. Sign in with the store review number and code set in the Yallapp plugin\'s settings.', 'yallapp' ),
				array( 'status' => 403 )
			);
		}
		// Email only: the store review number still signs in (reviewers and the preview use it).
		if ( ! in_array( Methods::PHONE, $this->methods(), true ) && ! $this->is_review_phone( $phone ) ) {
			return new WP_Error( 'method_not_allowed', __( 'This app signs in with your email address and password.', 'yallapp' ), array( 'status' => 403 ) );
		}

		$resend = (int) $this->settings->get( 'resend_seconds' );
		$wait   = Rate_Limiter::hit( 'resend|' . $phone->e164(), 1, max( 1, $resend ) );
		if ( $wait ) {
			return self::rate_limited( $wait );
		}
		$wait = Rate_Limiter::hit( 'phone|' . $phone->e164(), max( 1, (int) $this->settings->get( 'max_code_requests_per_hour' ) ), HOUR_IN_SECONDS );
		if ( ! $wait ) {
			$wait = Rate_Limiter::hit( 'ip|' . Rate_Limiter::client_ip(), self::IP_LIMIT_PER_H, HOUR_IN_SECONDS );
		}
		if ( $wait ) {
			return self::rate_limited( $wait );
		}

		$user_id = $this->otp->find_user( $phone );
		$review  = $this->is_review_phone( $phone );
		if ( ! $review ) {
			$sent = $this->otp->send( $phone, ! $user_id );
			if ( is_wp_error( $sent ) ) {
				Rate_Limiter::clear( 'resend|' . $phone->e164() );
				return $sent;
			}
		}

		$request_id = Crypto::token( 24 );
		set_transient(
			'yallapp_otp_' . Crypto::hash( $request_id ),
			array(
				'country_code' => $phone->country_code,
				'number'       => $phone->number,
				'attempts'     => 0,
				'review'       => $review,
			),
			self::REQUEST_TTL
		);

		return array(
			'request_id'           => $request_id,
			'code_length'          => self::CODE_LENGTH,
			'resend_after_seconds' => $resend,
			'expires_in_seconds'   => self::CODE_EXPIRES_IN,
		);
	}

	/**
	 * Verifies a code and signs in, or asks for sign-up details.
	 *
	 * @param string $request_id Request ID from request().
	 * @param string $code       Code.
	 * @param array  $device     DeviceInput.
	 * @return array|WP_Error Session, or SignupRequired.
	 */
	public function verify( $request_id, $code, array $device ) {
		$key   = 'yallapp_otp_' . Crypto::hash( (string) $request_id );
		$state = get_transient( $key );
		if ( ! is_array( $state ) ) {
			return new WP_Error( 'code_expired', __( 'This code has expired. Please request a new one.', 'yallapp' ), array( 'status' => 400 ) );
		}
		if ( $state['attempts'] >= self::MAX_ATTEMPTS ) {
			delete_transient( $key );
			return new WP_Error( 'code_expired', __( 'Too many wrong codes. Please request a new one.', 'yallapp' ), array( 'status' => 400 ) );
		}
		++$state['attempts'];
		set_transient( $key, $state, self::REQUEST_TTL );

		$phone   = Phone::parse( $state['country_code'], $state['number'] );
		$user_id = $this->otp->find_user( $phone );
		if ( $state['review'] ) {
			$valid = $this->is_review_phone( $phone ) && hash_equals( (string) $this->settings->get( 'review_code' ), (string) $code )
				? true
				: new WP_Error( 'invalid_code', __( 'That code is not correct.', 'yallapp' ), array( 'status' => 400 ) );
		} else {
			$valid = $this->otp->verify( $phone, (string) $code, ! $user_id );
		}
		if ( is_wp_error( $valid ) ) {
			return $valid;
		}
		delete_transient( $key );

		if ( $user_id ) {
			return $this->session( $user_id, $device );
		}
		if ( ! $this->settings->get( 'signup_allowed' ) ) {
			return new WP_Error( 'signup_disabled', __( 'There is no account with this number.', 'yallapp' ), array( 'status' => 403 ) );
		}
		$signup_token = Crypto::token( 24 );
		set_transient(
			'yallapp_signup_' . Crypto::hash( $signup_token ),
			array(
				'country_code' => $phone->country_code,
				'number'       => $phone->number,
			),
			self::SIGNUP_TTL
		);
		return array(
			'signup_required' => true,
			'signup_token'    => $signup_token,
			'fields'          => $this->signup_fields(),
		);
	}

	/**
	 * Creates the account for a verified new number and signs in.
	 *
	 * @param string $signup_token Token from verify().
	 * @param array  $fields       name, email, city.
	 * @param array  $device       DeviceInput.
	 * @return array|WP_Error Session.
	 */
	public function register( $signup_token, array $fields, array $device ) {
		$key   = 'yallapp_signup_' . Crypto::hash( (string) $signup_token );
		$state = get_transient( $key );
		if ( ! is_array( $state ) ) {
			return new WP_Error( 'code_expired', __( 'Your verification has expired. Please start again.', 'yallapp' ), array( 'status' => 400 ) );
		}
		$phone = Phone::parse( $state['country_code'], $state['number'] );
		if ( $this->otp->find_user( $phone ) ) {
			return new WP_Error( 'account_exists', __( 'An account with this number already exists. Please sign in.', 'yallapp' ), array( 'status' => 409 ) );
		}

		$required = $this->signup_fields();
		$name     = sanitize_text_field( (string) ( $fields['name'] ?? '' ) );
		$email    = sanitize_email( (string) ( $fields['email'] ?? '' ) );
		$city     = sanitize_text_field( (string) ( $fields['city'] ?? '' ) );
		if ( '' === $name ) {
			return new WP_Error( 'invalid_request', __( 'Please enter your name.', 'yallapp' ), array( 'status' => 400 ) );
		}
		if ( in_array( 'email', $required, true ) && ! is_email( $email ) ) {
			return new WP_Error( 'invalid_request', __( 'Please enter a valid email address.', 'yallapp' ), array( 'status' => 400 ) );
		}
		if ( '' !== $email && email_exists( $email ) ) {
			return new WP_Error( 'email_exists', __( 'This email is already used by another account.', 'yallapp' ), array( 'status' => 409 ) );
		}
		if ( in_array( 'city', $required, true ) && '' === $city ) {
			return new WP_Error( 'invalid_request', __( 'Please enter your city.', 'yallapp' ), array( 'status' => 400 ) );
		}

		$login = 'u' . preg_replace( '/\D+/', '', $phone->e164() );
		while ( username_exists( $login ) ) {
			$login .= wp_rand( 0, 9 );
		}
		$user_id = wp_insert_user(
			array(
				'user_login'   => $login,
				'user_pass'    => wp_generate_password( 32, true, true ),
				'user_email'   => $email,
				'display_name' => $name,
				'first_name'   => $name,
				'role'         => get_option( 'default_role', 'subscriber' ),
			)
		);
		if ( is_wp_error( $user_id ) ) {
			return new WP_Error( 'invalid_request', $user_id->get_error_message(), array( 'status' => 400 ) );
		}
		$this->otp->attach_phone( $user_id, $phone );
		update_user_meta( $user_id, self::USER_META_SOURCE, 1 );
		if ( '' !== $city ) {
			update_user_meta( $user_id, self::USER_META_CITY, $city );
		}
		delete_transient( $key );

		/**
		 * Fires after a student creates an account from the app.
		 *
		 * @param int $user_id User ID.
		 */
		do_action( 'yallapp_user_registered', $user_id );

		return $this->session( (int) $user_id, $device );
	}

	/**
	 * Registers the device and issues tokens.
	 *
	 * @param int   $user_id User ID.
	 * @param array $device  DeviceInput.
	 * @return array|WP_Error
	 */
	public function session( $user_id, array $device ) {
		$row_id = $this->devices->register( $user_id, $device );
		if ( is_wp_error( $row_id ) ) {
			return $row_id;
		}
		return array_merge( $this->tokens->issue( $user_id, $row_id ), array( 'user' => self::user( $user_id ) ) );
	}

	/**
	 * Fields new accounts must fill in.
	 *
	 * @return string[]
	 */
	public function signup_fields() {
		return array_values( array_unique( array_merge( array( 'name' ), (array) $this->settings->get( 'signup_fields' ) ) ) );
	}

	/**
	 * API shape of a user.
	 *
	 * @param int $user_id User ID.
	 * @return array
	 */
	public static function user( $user_id ) {
		$user  = get_userdata( $user_id );
		$phone = (string) get_user_meta( $user_id, Digits_Adapter::META_FULL, true );
		$city  = (string) get_user_meta( $user_id, self::USER_META_CITY, true );
		$email = $user ? (string) $user->user_email : '';
		return array(
			'id'         => (int) $user_id,
			'name'       => $user ? (string) $user->display_name : '',
			'phone'      => $phone,
			'email'      => '' !== $email ? $email : null,
			'city'       => '' !== $city ? $city : null,
			'avatar_url' => self::avatar_url( $user_id ),
		);
	}

	/**
	 * A user's photo from their LMS profile. Gravatar is not used, so no email hash leaves the site.
	 *
	 * @param int $user_id User ID.
	 * @return string|null
	 */
	public static function avatar_url( $user_id ) {
		$photo = (int) get_user_meta( $user_id, '_tutor_profile_photo', true );
		/**
		 * Filters a user's photo URL in the app.
		 *
		 * @param string|null $url     Photo URL.
		 * @param int         $user_id User ID.
		 */
		$url = apply_filters( 'yallapp_avatar_url', $photo ? wp_get_attachment_image_url( $photo, 'thumbnail' ) : null, $user_id );
		return $url ? (string) $url : null;
	}

	/**
	 * Whether this is the store review number and review access is on.
	 *
	 * @param Phone $phone Phone number.
	 * @return bool
	 */
	private function is_review_phone( Phone $phone ) {
		if ( ! $this->settings->get( 'review_access_enabled' ) || '' === (string) $this->settings->get( 'review_code' ) ) {
			return false;
		}
		$review = Phone::parse( $this->settings->get( 'default_country_code' ), (string) $this->settings->get( 'review_phone' ) );
		$raw    = (string) $this->settings->get( 'review_phone' );
		if ( 0 === strpos( trim( $raw ), '+' ) ) {
			$digits = preg_replace( '/\D+/', '', $raw );
			return '+' . $digits === $phone->e164();
		}
		return $review && $review->e164() === $phone->e164();
	}

	/**
	 * Rate limit error.
	 *
	 * @param int $wait Seconds to wait.
	 * @return WP_Error
	 */
	private static function rate_limited( $wait ) {
		return new WP_Error(
			'rate_limited',
			__( 'Please wait a moment before requesting another code.', 'yallapp' ),
			array(
				'status'              => 429,
				'retry_after_seconds' => (int) $wait,
			)
		);
	}
}
