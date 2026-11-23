<?php
/**
 * Plugin Name: Yallapp dev site: no real platform
 * Description: 206.1 The dev site never reaches Yallapp's own server. A call to the platform
 * (YALLAPP_PLATFORM_URL) or to yallapp.com.tr that a check script's own pre_http_request filter
 * didn't answer fails at once, as when the platform can't be reached, so checks running with test
 * license keys send nothing anywhere and wait on nothing.
 *
 * @package Yallapp
 */

add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) {
		if ( false !== $pre ) {
			return $pre;
		}
		$host     = (string) wp_parse_url( (string) $url, PHP_URL_HOST );
		$platform = defined( 'YALLAPP_PLATFORM_URL' ) ? (string) wp_parse_url( (string) YALLAPP_PLATFORM_URL, PHP_URL_HOST ) : '';
		$ours     = 'yallapp.com.tr' === $host || '.yallapp.com.tr' === substr( $host, -15 );
		if ( $ours || ( '' !== $platform && $platform === $host && ! in_array( $host, array( '127.0.0.1', 'localhost' ), true ) ) ) {
			return new WP_Error( 'http_request_failed', 'The dev site has no Yallapp platform (' . $host . ').' );
		}
		return $pre;
	},
	PHP_INT_MAX,
	3
);
