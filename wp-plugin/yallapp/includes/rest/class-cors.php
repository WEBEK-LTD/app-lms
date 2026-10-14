<?php
/**
 * Cross-origin access for the app preview.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

/**
 * The Yallapp dashboard's app preview runs the client's app in a browser on
 * yallapp.com.tr. WordPress already answers cross-origin REST requests with
 * the visitor's origin; these filters add the headers the app sends and
 * reads, so the browser lets the preview use them. Nothing changes for the
 * installed app, which isn't a browser.
 */
class Cors {

	/**
	 * Request headers the app may send, besides the ones WordPress allows.
	 */
	const REQUEST_HEADERS = array( 'Accept-Language', 'If-None-Match', 'X-Yallapp-Preview' );

	/**
	 * Response headers the app may read.
	 */
	const RESPONSE_HEADERS = array( 'ETag', 'X-Yallapp-Plugin-Version' );

	/**
	 * Hooks the filters (WordPress 5.5 and later have them).
	 *
	 * @return void
	 */
	public static function register() {
		add_filter( 'rest_allowed_cors_headers', array( self::class, 'allowed_headers' ) );
		add_filter( 'rest_exposed_cors_headers', array( self::class, 'exposed_headers' ) );
	}

	/**
	 * Filter `rest_allowed_cors_headers`.
	 *
	 * @param string[] $headers Headers WordPress allows.
	 * @return string[]
	 */
	public static function allowed_headers( $headers ) {
		return self::merge( $headers, self::REQUEST_HEADERS );
	}

	/**
	 * Filter `rest_exposed_cors_headers`.
	 *
	 * @param string[] $headers Headers WordPress exposes.
	 * @return string[]
	 */
	public static function exposed_headers( $headers ) {
		return self::merge( $headers, self::RESPONSE_HEADERS );
	}

	/**
	 * Adds headers that aren't in the list yet (header names ignore case).
	 *
	 * @param mixed    $headers The list from WordPress or another plugin.
	 * @param string[] $add     Headers to add.
	 * @return string[]
	 */
	private static function merge( $headers, array $add ) {
		$list = is_array( $headers ) ? array_values( $headers ) : array();
		$have = array_map( 'strtolower', array_map( 'strval', $list ) );
		foreach ( $add as $header ) {
			if ( ! in_array( strtolower( $header ), $have, true ) ) {
				$list[] = $header;
				$have[] = strtolower( $header );
			}
		}
		return $list;
	}
}
