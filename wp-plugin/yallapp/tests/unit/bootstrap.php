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

require_once YALLAPP_DIR . 'vendor/autoload.php';
require_once YALLAPP_DIR . 'includes/class-autoloader.php';
Yallapp\Autoloader::register();
