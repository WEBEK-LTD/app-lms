<?php
/**
 * Prices as plain text.
 *
 * @package Yallapp
 */

namespace Yallapp\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * Turns the HTML prices LMS and shop plugins print into text the app can show.
 */
class Money {

	/**
	 * "<span>&#8378;</span>450.00" to "₺450.00".
	 *
	 * @param string $html Price HTML.
	 * @return string
	 */
	public static function plain( $html ) {
		$text = html_entity_decode( wp_strip_all_tags( (string) $html ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		return trim( (string) preg_replace( '/\s+/u', ' ', str_replace( "\xc2\xa0", ' ', $text ) ) );
	}
}
