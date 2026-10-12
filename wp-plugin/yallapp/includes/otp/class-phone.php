<?php
/**
 * Phone number value object.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

/**
 * A phone number split into country code and national number, normalised to digits.
 */
class Phone {

	/**
	 * Country code with plus sign, e.g. "+90".
	 *
	 * @var string
	 */
	public $country_code;

	/**
	 * National number, digits only, without a trunk prefix, e.g. "5321234567".
	 *
	 * @var string
	 */
	public $number;

	/**
	 * Constructor.
	 *
	 * @param string $country_code Country code.
	 * @param string $number       National number.
	 */
	private function __construct( $country_code, $number ) {
		$this->country_code = $country_code;
		$this->number       = $number;
	}

	/**
	 * Parses user input. Accepts "+90" or "90" and numbers with spaces, dashes or a leading 0.
	 *
	 * @param string $country_code Country code.
	 * @param string $number       National number.
	 * @return Phone|null Null when invalid.
	 */
	public static function parse( $country_code, $number ) {
		$cc            = preg_replace( '/\D+/', '', (string) $country_code );
		$raw           = trim( (string) $number );
		$international = 0 === strpos( $raw, '+' ) || 0 === strpos( $raw, '00' );
		$digits        = ltrim( (string) preg_replace( '/\D+/', '', $raw ), '0' );
		if ( '' === $cc || strlen( $cc ) > 3 || '' === $digits ) {
			return null;
		}
		// A number typed with its country code again ("+90 532...", "0090...", "90532...") keeps only the
		// national part. Without a "+" or "00" this only applies when the result would be too long to be a
		// real number, so national numbers that happen to start with the code's digits stay intact.
		if ( 0 === strpos( $digits, $cc ) && ( $international || strlen( $cc . $digits ) > 13 ) ) {
			$digits = ltrim( substr( $digits, strlen( $cc ) ), '0' );
		} elseif ( '1' === $cc && 11 === strlen( $digits ) && '1' === $digits[0] ) {
			$digits = substr( $digits, 1 );
		}
		$total = strlen( $cc . $digits );
		if ( $total < 8 || $total > 15 ) {
			return null;
		}
		return new self( '+' . $cc, $digits );
	}

	/**
	 * E.164 form, e.g. "+905321234567".
	 *
	 * @return string
	 */
	public function e164() {
		return $this->country_code . $this->number;
	}
}
