<?php
/**
 * The signature and body of Yallapp's "give or take access" request.
 *
 * @package Yallapp
 */

namespace Yallapp\Billing;

defined( 'ABSPATH' ) || exit;

use Yallapp\License\Refresh_Signature;

/**
 * 100.4 `POST /billing/access` (docs/api/openapi.yaml, storeAccess): once Yallapp has checked a
 * purchase with Google or Apple (and again when it is refunded, revoked, renewed or ended), it
 * asks the site to give or take the access. Signed like `POST /license/refresh`: the headers
 * `Yallapp-Timestamp` and `Yallapp-Signature`, the lowercase hex HMAC-SHA256 of
 * `yallapp-billing-access:<timestamp>:<the raw body>`, keyed with the license key in capitals.
 * Checked on the raw body, so nothing is re-encoded before it is checked. Pure.
 */
class Access_Request {

	/**
	 * What is signed, before the timestamp.
	 */
	const PREFIX = 'yallapp-billing-access:';

	/**
	 * The largest body accepted.
	 */
	const MAX_BODY = 8192;

	/**
	 * The signature of a body: lowercase hex HMAC-SHA256 of `yallapp-billing-access:<timestamp>:<raw body>`,
	 * keyed with the license key in capitals.
	 *
	 * @param string $key       License key.
	 * @param int    $timestamp Unix time in seconds.
	 * @param string $raw       The body as sent.
	 * @return string
	 */
	public static function sign( $key, $timestamp, $raw ) {
		return hash_hmac( 'sha256', self::PREFIX . (int) $timestamp . ':' . (string) $raw, strtoupper( trim( (string) $key ) ) );
	}

	/**
	 * Whether the request is Yallapp's: a license key is saved, the timestamp is a whole number
	 * within 5 minutes of now, and the signature matches it and the body.
	 *
	 * @param string $key       The saved license key ('' when none).
	 * @param mixed  $timestamp The `Yallapp-Timestamp` header.
	 * @param mixed  $signature The `Yallapp-Signature` header.
	 * @param mixed  $raw       The body as received.
	 * @param int    $now       Unix time now.
	 * @return bool
	 */
	public static function verify( $key, $timestamp, $signature, $raw, $now ) {
		if ( '' === trim( (string) $key ) || ! is_string( $raw ) || strlen( $raw ) > self::MAX_BODY ) {
			return false;
		}
		if ( ! is_string( $signature ) || 1 !== preg_match( '/^[0-9a-f]{64}$/', $signature ) ) {
			return false;
		}
		if ( ! is_string( $timestamp ) || 1 !== preg_match( '/^\d{1,12}$/', trim( $timestamp ) ) ) {
			return false;
		}
		$timestamp = (int) trim( $timestamp );
		if ( abs( (int) $now - $timestamp ) > Refresh_Signature::MAX_AGE ) {
			return false;
		}
		return hash_equals( self::sign( $key, $timestamp, $raw ), $signature );
	}

	/**
	 * The request's fields, checked: null when one is missing or wrong.
	 *
	 * @param mixed $data Decoded body.
	 * @return array{grant_id: string, action: string, user_id: int, kind: string, course_id: int|null, plan_id: string|null, expires_at: int|null, platform: string, transaction_id: string, amount: string|null, currency: string|null}|null
	 */
	public static function parse( $data ) {
		if ( ! is_array( $data ) ) {
			return null;
		}
		$grant_id    = $data['grant_id'] ?? null;
		$action      = $data['action'] ?? null;
		$user_id     = $data['user_id'] ?? null;
		$kind        = $data['kind'] ?? null;
		$platform    = $data['platform'] ?? null;
		$transaction = $data['transaction_id'] ?? null;
		if ( ! is_string( $grant_id ) || 1 !== preg_match( '/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/', $grant_id ) ) {
			return null;
		}
		if ( ! in_array( $action, array( 'grant', 'revoke' ), true ) || ! in_array( $kind, array( 'course', 'membership' ), true ) || ! in_array( $platform, array( 'android', 'ios' ), true ) ) {
			return null;
		}
		if ( ! is_int( $user_id ) || $user_id < 1 || ! is_string( $transaction ) || '' === trim( $transaction ) || strlen( $transaction ) > 200 ) {
			return null;
		}
		$course_id = $data['course_id'] ?? null;
		$plan_id   = $data['plan_id'] ?? null;
		if ( 'course' === $kind && ( ! is_int( $course_id ) || $course_id < 1 ) ) {
			return null;
		}
		if ( 'membership' === $kind && ( ! is_string( $plan_id ) || null === Store_Billing::plan_source( $plan_id ) ) ) {
			return null;
		}
		$expires = null;
		if ( isset( $data['expires_at'] ) ) {
			$time = is_string( $data['expires_at'] ) ? strtotime( $data['expires_at'] ) : false;
			if ( false === $time ) {
				return null;
			}
			$expires = $time;
		}
		$amount   = $data['amount'] ?? null;
		$currency = $data['currency'] ?? null;
		return array(
			'grant_id'       => strtolower( $grant_id ),
			'action'         => $action,
			'user_id'        => $user_id,
			'kind'           => $kind,
			'course_id'      => 'course' === $kind ? $course_id : null,
			'plan_id'        => 'membership' === $kind ? $plan_id : null,
			'expires_at'     => 'membership' === $kind ? $expires : null,
			'platform'       => $platform,
			'transaction_id' => trim( $transaction ),
			'amount'         => is_string( $amount ) || is_int( $amount ) || is_float( $amount ) ? Store_Billing::price_text( $amount ) : null,
			'currency'       => is_string( $currency ) && 1 === preg_match( '/^[A-Z]{3}$/', $currency ) ? $currency : null,
		);
	}
}
