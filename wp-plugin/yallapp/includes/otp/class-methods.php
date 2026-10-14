<?php
/**
 * How people sign in to the app.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

/**
 * Phone (a code), email (the WordPress email and password) or both. The app's owner chooses on
 * the Yallapp dashboard's App sign-in page, and the platform sends the choice with the license
 * status (`sign_in_methods`); until they choose, the plugin's own setting applies. Pure.
 */
class Methods {

	const PHONE = 'phone';
	const EMAIL = 'email';

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
	 * Whether the platform's choice replaces the plugin setting.
	 *
	 * @param mixed $platform The license status's `sign_in_methods`.
	 * @return bool
	 */
	public static function from_platform( $platform ) {
		return is_array( $platform ) && (bool) array_intersect( array( self::PHONE, self::EMAIL ), $platform );
	}
}
