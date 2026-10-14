<?php
/**
 * Sign-in codes the plugin makes itself.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

/**
 * Makes a 6-digit code and checks it, like the hosted API's challenges: the code is kept
 * only as an HMAC with the site secret, it is valid for 5 minutes, and it allows at most
 * 5 attempts. Pure functions: the caller stores the record and passes the time.
 */
class Code_Challenge {

	const LENGTH       = 6;
	const TTL          = 300;
	const MAX_ATTEMPTS = 5;

	/**
	 * A new random code.
	 *
	 * @return string Six digits, leading zeros kept.
	 */
	public static function new_code() {
		return str_pad( (string) random_int( 0, 999999 ), self::LENGTH, '0', STR_PAD_LEFT );
	}

	/**
	 * The record to store for a code that was sent.
	 *
	 * @param string $phone  Phone number (E.164).
	 * @param string $code   Code.
	 * @param string $secret Site secret.
	 * @param int    $now    Unix time.
	 * @return array{hash: string, expires_at: int, attempts: int}
	 */
	public static function record( $phone, $code, $secret, $now ) {
		return array(
			'hash'       => self::hash( $phone, $code, $secret ),
			'expires_at' => (int) $now + self::TTL,
			'attempts'   => 0,
		);
	}

	/**
	 * Checks a code typed for a stored record.
	 *
	 * `result` is `ok` (right: forget the record), `wrong` (store `record` again), `expired`
	 * (no record, or too old) or `too_many` (the last attempt was used). `record` is null when
	 * the record must be deleted.
	 *
	 * @param mixed  $record The stored record, or anything else when there is none.
	 * @param string $phone  Phone number (E.164).
	 * @param string $code   Code typed.
	 * @param string $secret Site secret.
	 * @param int    $now    Unix time.
	 * @return array{result: string, record: array|null}
	 */
	public static function check( $record, $phone, $code, $secret, $now ) {
		if ( ! is_array( $record ) || empty( $record['hash'] ) || ! isset( $record['expires_at'] ) || (int) $record['expires_at'] <= (int) $now ) {
			return array(
				'result' => 'expired',
				'record' => null,
			);
		}
		$attempts = (int) ( $record['attempts'] ?? 0 );
		if ( $attempts >= self::MAX_ATTEMPTS ) {
			return array(
				'result' => 'too_many',
				'record' => null,
			);
		}
		$code = (string) $code;
		if ( 1 === preg_match( '/^\d{' . self::LENGTH . '}$/', $code ) && hash_equals( (string) $record['hash'], self::hash( $phone, $code, $secret ) ) ) {
			return array(
				'result' => 'ok',
				'record' => null,
			);
		}
		$record['attempts'] = $attempts + 1;
		if ( $record['attempts'] >= self::MAX_ATTEMPTS ) {
			return array(
				'result' => 'too_many',
				'record' => null,
			);
		}
		return array(
			'result' => 'wrong',
			'record' => $record,
		);
	}

	/**
	 * Seconds a record still has to live, at least 1.
	 *
	 * @param array $record Record.
	 * @param int   $now    Unix time.
	 * @return int
	 */
	public static function ttl_left( array $record, $now ) {
		return max( 1, (int) $record['expires_at'] - (int) $now );
	}

	/**
	 * HMAC of the number and code, keyed with the site secret.
	 *
	 * @param string $phone  Phone number (E.164).
	 * @param string $code   Code.
	 * @param string $secret Site secret.
	 * @return string Hex digest.
	 */
	private static function hash( $phone, $code, $secret ) {
		return hash_hmac( 'sha256', 'yallapp-code|' . $phone . '|' . $code, $secret );
	}
}
