<?php
/**
 * Unit test bootstrap: loads the plugin's pure classes without WordPress.
 *
 * @package Yallapp
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'YALLAPP_DIR', dirname( __DIR__, 2 ) . '/' );

if ( ! function_exists( 'wp_json_encode' ) ) {
	/**
	 * Minimal stand-in for WordPress's JSON encoder.
	 *
	 * @param mixed $data Data.
	 * @return string|false
	 */
	function wp_json_encode( $data ) {
		return json_encode( $data );
	}
}

if ( ! function_exists( '__' ) ) {
	/**
	 * Minimal stand-in for WordPress's translation function: the English text.
	 *
	 * @param string $text   Text.
	 * @param string $domain Text domain.
	 * @return string
	 */
	function __( $text, $domain = 'default' ) { // phpcs:ignore WordPress.WP.I18n
		unset( $domain );
		return $text;
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Minimal stand-in for WordPress's tag stripper.
	 *
	 * @param string $text Text.
	 * @return string
	 */
	function wp_strip_all_tags( $text ) {
		return trim( strip_tags( (string) preg_replace( '@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $text ) ) );
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	/**
	 * Minimal stand-in for WordPress's single-line text cleaner: no tags, no line breaks.
	 *
	 * @param string $text Text.
	 * @return string
	 */
	function sanitize_text_field( $text ) {
		return trim( (string) preg_replace( '/\s+/', ' ', wp_strip_all_tags( (string) $text ) ) );
	}
}

if ( ! function_exists( 'sanitize_textarea_field' ) ) {
	/**
	 * Minimal stand-in for WordPress's multi-line text cleaner: no tags, line breaks kept.
	 *
	 * @param string $text Text.
	 * @return string
	 */
	function sanitize_textarea_field( $text ) {
		return trim( wp_strip_all_tags( (string) $text ) );
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	/**
	 * Minimal stand-in for WordPress's URL cleaner: only the given schemes.
	 *
	 * @param string   $url       URL.
	 * @param string[] $protocols Allowed schemes.
	 * @return string
	 */
	function esc_url_raw( $url, $protocols = array( 'http', 'https' ) ) {
		$scheme = strtolower( (string) parse_url( (string) $url, PHP_URL_SCHEME ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url
		return in_array( $scheme, $protocols, true ) && false === strpbrk( (string) $url, " \t\n<>\"" ) ? (string) $url : '';
	}

	/**
	 * WordPress's parse_url wrapper.
	 *
	 * @param string $url       URL.
	 * @param int    $component Component, or -1 for all.
	 * @return mixed
	 */
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( (string) $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url
	}

	/**
	 * Removes trailing slashes.
	 *
	 * @param string $value Value.
	 * @return string
	 */
	function untrailingslashit( $value ) {
		return rtrim( (string) $value, '/\\' );
	}
}

if ( ! function_exists( 'is_email' ) ) {
	/**
	 * Minimal stand-in for WordPress's email check: the address, or false.
	 *
	 * @param string $email Email address.
	 * @return string|false
	 */
	function is_email( $email ) {
		return false !== filter_var( (string) $email, FILTER_VALIDATE_EMAIL ) ? (string) $email : false;
	}
}

require_once YALLAPP_DIR . 'vendor/autoload.php';
require_once YALLAPP_DIR . 'includes/class-autoloader.php';
Yallapp\Autoloader::register();
