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

require_once YALLAPP_DIR . 'vendor/autoload.php';
require_once YALLAPP_DIR . 'includes/class-autoloader.php';
Yallapp\Autoloader::register();
