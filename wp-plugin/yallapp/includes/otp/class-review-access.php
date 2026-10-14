<?php
/**
 * Store review access by email.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

/**
 * Apple and Google reviewers can't receive codes. With store review access on, the test number
 * signs in with the fixed code (Sign_In), and so does the test email address: on email sign-in
 * (an email address and a password) reviewers type the test email address and the fixed code as
 * the password. Apps that sign in by email only show no phone field, so they need the address.
 * Pure: it reads the settings it is given.
 */
class Review_Access {

	/**
	 * Whether review access is on with a fixed code and this is its test email address.
	 *
	 * @param array  $settings The plugin settings (review_access_enabled, review_email, review_code).
	 * @param string $login    The email address (or username) typed in the app.
	 * @return bool
	 */
	public static function is_review_email( array $settings, $login ) {
		if ( empty( $settings['review_access_enabled'] ) || '' === trim( (string) ( $settings['review_code'] ?? '' ) ) ) {
			return false;
		}
		$email = strtolower( trim( (string) ( $settings['review_email'] ?? '' ) ) );
		return '' !== $email && false !== strpos( $email, '@' ) && strtolower( trim( (string) $login ) ) === $email;
	}

	/**
	 * Whether the typed password is the fixed review code.
	 *
	 * @param array  $settings The plugin settings.
	 * @param string $password The password typed in the app.
	 * @return bool
	 */
	public static function code_matches( array $settings, $password ) {
		$code = trim( (string) ( $settings['review_code'] ?? '' ) );
		return '' !== $code && hash_equals( $code, trim( (string) $password ) );
	}
}
