<?php
/**
 * Minimal HS256 JSON Web Tokens.
 *
 * @package Yallapp
 */

namespace Yallapp\Auth;

defined( 'ABSPATH' ) || exit;

use Yallapp\Crypto;

/**
 * Encodes and decodes HS256 JWTs. Only HS256 is accepted when decoding.
 */
class Jwt {

	/**
	 * Allowed clock skew in seconds.
	 */
	const LEEWAY = 30;

	/**
	 * Creates a signed token.
	 *
	 * @param array  $claims Payload claims.
	 * @param string $key    Raw secret.
	 * @return string
	 */
	public static function encode( array $claims, $key ) {
		$header  = Crypto::base64url_encode(
			(string) wp_json_encode(
				array(
					'alg' => 'HS256',
					'typ' => 'JWT',
				)
			)
		);
		$payload = Crypto::base64url_encode( (string) wp_json_encode( $claims ) );
		$sig     = Crypto::base64url_encode( hash_hmac( 'sha256', $header . '.' . $payload, $key, true ) );
		return $header . '.' . $payload . '.' . $sig;
	}

	/**
	 * Verifies a token and returns its claims.
	 *
	 * @param string $token Token.
	 * @param string $key   Raw secret.
	 * @param int    $now   Current time.
	 * @return array|null Claims, or null when invalid or expired.
	 */
	public static function decode( $token, $key, $now ) {
		$parts = explode( '.', (string) $token );
		if ( 3 !== count( $parts ) ) {
			return null;
		}
		$header = json_decode( Crypto::base64url_decode( $parts[0] ), true );
		if ( ! is_array( $header ) || ( $header['alg'] ?? '' ) !== 'HS256' ) {
			return null;
		}
		$expected = Crypto::base64url_encode( hash_hmac( 'sha256', $parts[0] . '.' . $parts[1], $key, true ) );
		if ( ! hash_equals( $expected, $parts[2] ) ) {
			return null;
		}
		$claims = json_decode( Crypto::base64url_decode( $parts[1] ), true );
		if ( ! is_array( $claims ) ) {
			return null;
		}
		if ( isset( $claims['exp'] ) && $now - self::LEEWAY >= (int) $claims['exp'] ) {
			return null;
		}
		if ( isset( $claims['nbf'] ) && $now + self::LEEWAY < (int) $claims['nbf'] ) {
			return null;
		}
		return $claims;
	}
}
