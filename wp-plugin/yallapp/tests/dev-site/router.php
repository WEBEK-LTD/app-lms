<?php
/**
 * Router for PHP's built-in server: serve real files, send everything else to WordPress.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.Security.ValidatedSanitizedInput -- Dev-only router for PHP's built-in server.
$yallapp_path = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_parse_url_fallback( $_SERVER['REQUEST_URI'] ) : '/';
$yallapp_file = $_SERVER['DOCUMENT_ROOT'] . $yallapp_path;

if ( '/' !== $yallapp_path && is_file( $yallapp_file ) && '.php' !== substr( $yallapp_file, -4 ) ) {
	return false;
}
if ( is_file( $yallapp_file ) && '.php' === substr( $yallapp_file, -4 ) ) {
	require $yallapp_file;
	return;
}
$_SERVER['SCRIPT_NAME'] = '/index.php';
require $_SERVER['DOCUMENT_ROOT'] . '/index.php';

/**
 * Path part of a request URI, without WordPress loaded.
 *
 * @param string $uri Request URI.
 * @return string
 */
function wp_parse_url_fallback( $uri ) {
	$path = parse_url( $uri, PHP_URL_PATH ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url -- WordPress isn't loaded yet.
	return is_string( $path ) ? rawurldecode( $path ) : '/';
}
