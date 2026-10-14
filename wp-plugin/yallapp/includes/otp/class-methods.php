<?php
/**
 * How people sign in to the app.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

/**
 * Phone (a code), email (the WordPress email and password, or a code by email) or both. The app's owner chooses on
 * the Yallapp dashboard's App sign-in page, and the platform sends the choice with the license
 * status (`sign_in_methods`); until they choose, the plugin's own setting applies. Pure.
 */
class Methods {

	const PHONE = 'phone';
	const EMAIL = 'email';

	/**
	 * How email sign-in works.
	 */
	const PASSWORD = 'password';
	const CODE     = 'code';

	/**
	 * The plugin setting's choices.
	 */
	const CHOICES = array(
		'phone' => array( self::PHONE ),
		'email' => array( self::EMAIL ),
		'both'  => array( self::PHONE, self::EMAIL ),
	);

	/**
	 * The methods in use.
	 *
	 * @param mixed  $platform The license status's `sign_in_methods` (an array, or null when the owner hasn't chosen).
	 * @param string $setting  The plugin setting: `phone`, `email` or `both`.
	 * @return string[] `phone` and/or `email`, never empty.
	 */
	public static function resolve( $platform, $setting ) {
		if ( is_array( $platform ) ) {
			$methods = array_values( array_intersect( array( self::PHONE, self::EMAIL ), $platform ) );
			if ( $methods ) {
				return $methods;
			}
		}
		return self::CHOICES[ $setting ] ?? self::CHOICES['phone'];
	}

	/**
	 * How email sign-in works: `password` (existing accounts, the WordPress password) or `code`
	 * (a code by email; people without an account sign up). The owner's choice on the Yallapp
	 * dashboard (the license status's `email_sign_in`), else the plugin setting, else password.
	 *
	 * @param mixed  $platform The license status's `email_sign_in` (`code`, `password` or null).
	 * @param string $setting  The plugin setting.
	 * @return string `code` or `password`.
	 */
	public static function email_way( $platform, $setting ) {
		foreach ( array( $platform, $setting ) as $way ) {
			if ( self::CODE === $way || self::PASSWORD === $way ) {
				return $way;
			}
		}
		return self::PASSWORD;
	}

	/**
	 * Whether the platform's choice replaces the plugin setting.
	 *
	 * @param mixed $platform The license status's `sign_in_methods`.
	 * @return bool
	 */
	public static function from_platform( $platform ) {
		return is_array( $platform ) && (bool) array_intersect( array( self::PHONE, self::EMAIL ), $platform );
	}
}
