<?php
/**
 * The signature on the platform's "check your license now" request.
 *
 * @package Yallapp
 */

namespace Yallapp\License;

defined( 'ABSPATH' ) || exit;

/**
 * 31 `POST /license/refresh` (docs/api/openapi.yaml, refreshLicense): the platform signs a
 * timestamp with the site's license key, which both sides know. A valid signature only
 * tells the plugin to ask the platform now; nothing in the request is trusted. Pure.
 */
class Refresh_Signature {

	/**
	 * How far, in seconds, the timestamp may be from this site's clock.
	 */
	const MAX_AGE = 300;

	/**
	 * What is signed, before the timestamp.
	 */
	const PREFIX = 'yallapp-license-refresh:';

	/**
	 * The signature of a timestamp: lowercase hex HMAC-SHA256, keyed with the license key in capitals.
	 *
	 * @param string $key       License key.
	 * @param int    $timestamp Unix time in seconds.
	 * @return string
	 */
	public static function sign( $key, $timestamp ) {
		return hash_hmac( 'sha256', self::PREFIX . (int) $timestamp, strtoupper( trim( (string) $key ) ) );
	}

	/**
	 * Whether the request is the platform's: a license key is saved, the timestamp is a whole
	 * number within 5 minutes of now, and the signature matches it.
	 *
	 * @param string $key       The saved license key ('' when none).
	 * @param mixed  $timestamp The request's timestamp.
	 * @param mixed  $signature The request's signature.
	 * @param int    $now       Unix time now.
	 * @return bool
	 */
	public static function verify( $key, $timestamp, $signature, $now ) {
		if ( '' === trim( (string) $key ) || ! is_string( $signature ) || 1 !== preg_match( '/^[0-9a-f]{64}$/', $signature ) ) {
			return false;
		}
		if ( is_string( $timestamp ) && 1 === preg_match( '/^\d{1,12}$/', $timestamp ) ) {
			$timestamp = (int) $timestamp;
		}
		if ( ! is_int( $timestamp ) || abs( (int) $now - $timestamp ) > self::MAX_AGE ) {
			return false;
		}
		return hash_equals( self::sign( $key, $timestamp ), $signature );
	}
}
