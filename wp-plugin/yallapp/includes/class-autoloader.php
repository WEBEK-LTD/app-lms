<?php
/**
 * Class autoloader.
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

/**
 * Maps `Yallapp\Sub_Namespace\Class_Name` to `includes/sub-namespace/class-class-name.php`
 * (or `interface-` for interfaces), following the WordPress file naming convention.
 */
class Autoloader {

	/**
	 * Registers the autoloader.
	 *
	 * @return void
	 */
	public static function register() {
		spl_autoload_register( array( __CLASS__, 'load' ) );
	}

	/**
	 * Loads a class of this plugin.
	 *
	 * @param string $class_name Fully qualified class name.
	 * @return void
	 */
	public static function load( $class_name ) {
		if ( 0 !== strpos( $class_name, __NAMESPACE__ . '\\' ) ) {
			return;
		}
		$parts = explode( '\\', substr( $class_name, strlen( __NAMESPACE__ ) + 1 ) );
		$name  = self::to_file_name( array_pop( $parts ) );
		$dir   = YALLAPP_DIR . 'includes/';
		foreach ( $parts as $part ) {
			$dir .= self::to_file_name( $part ) . '/';
		}
		foreach ( array( 'class-', 'interface-' ) as $prefix ) {
			$file = $dir . $prefix . $name . '.php';
			if ( is_readable( $file ) ) {
				require_once $file;
				return;
			}
		}
	}

	/**
	 * Converts `Class_Name` to `class-name`.
	 *
	 * @param string $name Class or namespace segment.
	 * @return string
	 */
	private static function to_file_name( $name ) {
		return strtolower( str_replace( '_', '-', $name ) );
	}
}
