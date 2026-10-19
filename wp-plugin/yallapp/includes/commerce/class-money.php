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
		// WooCommerce adds text for screen readers ("Original price was: ...") to sale prices.
		$html = preg_replace( '#<span[^>]*class="[^"]*screen-reader-text[^"]*"[^>]*>.*?</span>#is', '', (string) $html );
		$text = html_entity_decode( wp_strip_all_tags( (string) $html ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		return trim( (string) preg_replace( '/\s+/u', ' ', str_replace( "\xc2\xa0", ' ', $text ) ) );
	}

	/**
	 * 39 The price a buyer pays now, as text: a sale price's crossed-out regular price
	 * (`<del>`) is left out, so "<del>$300.00</del> <ins>$250.00</ins>" reads "$250.00"
	 * (`amount` and `sale_amount` still carry both). Pure.
	 *
	 * @param string $html Price HTML.
	 * @return string
	 */
	public static function current( $html ) {
		$text = self::plain( (string) preg_replace( '#<del\b[^>]*>.*?</del>#is', '', (string) $html ) );
		return '' !== $text ? $text : self::plain( $html );
	}
}
