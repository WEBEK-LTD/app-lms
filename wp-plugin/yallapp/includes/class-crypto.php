<?php
/**
 * Secrets, signatures and encryption.
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

/**
 * Site secret, URL-safe tokens, HMAC signatures and AES-256-GCM encryption for stored secrets.
 */
class Crypto {

	const SECRET_OPTION = 'yallapp_secret';

	/**
	 * The site's signing secret, created on first use.
	 *
	 * @return string Raw bytes.
	 */
	public static function secret() {
		$encoded = get_option( self::SECRET_OPTION );
		if ( ! is_string( $encoded ) || '' === $encoded ) {
			$encoded = self::base64url_encode( random_bytes( 64 ) );
			update_option( self::SECRET_OPTION, $encoded, false );
		}
		return self::base64url_decode( $encoded );
	}

	/**
	 * A random URL-safe token.
	 *
	 * @param int $bytes Entropy in bytes.
	 * @return string
	 */
	public static function token( $bytes = 32 ) {
		return self::base64url_encode( random_bytes( $bytes ) );
	}

	/**
	 * SHA-256 hash for storing tokens.
	 *
	 * @param string $value Token.
	 * @return string Hex digest.
	 */
	public static function hash( $value ) {
		return hash( 'sha256', $value );
	}

	/**
	 * HMAC-SHA256 signature with the site secret, URL-safe.
	 *
	 * @param string $data Data to sign.
	 * @return string
	 */
	public static function sign( $data ) {
		return self::base64url_encode( hash_hmac( 'sha256', $data, self::secret(), true ) );
	}

	/**
	 * Constant-time signature check.
	 *
	 * @param string $data      Signed data.
	 * @param string $signature Signature to check.
	 * @return bool
	 */
	public static function verify( $data, $signature ) {
		return hash_equals( self::sign( $data ), (string) $signature );
	}

	/**
	 * Encrypts a secret for storage.
	 *
	 * @param string $plain Plain text.
	 * @return string Encoded cipher text, or '' for empty input.
	 */
	public static function encrypt( $plain ) {
		if ( '' === $plain ) {
			return '';
		}
		$iv     = random_bytes( 12 );
		$tag    = '';
		$cipher = openssl_encrypt( $plain, 'aes-256-gcm', self::encryption_key(), OPENSSL_RAW_DATA, $iv, $tag );
		return 'v1:' . self::base64url_encode( $iv . $tag . $cipher );
	}

	/**
	 * Decrypts a value from encrypt().
	 *
	 * @param string $encoded Encoded cipher text.
	 * @return string Plain text, or '' when it can't be decrypted.
	 */
	public static function decrypt( $encoded ) {
		if ( 0 !== strpos( (string) $encoded, 'v1:' ) ) {
			return '';
		}
		$raw = self::base64url_decode( substr( $encoded, 3 ) );
		if ( strlen( $raw ) < 29 ) {
			return '';
		}
		$plain = openssl_decrypt( substr( $raw, 28 ), 'aes-256-gcm', self::encryption_key(), OPENSSL_RAW_DATA, substr( $raw, 0, 12 ), substr( $raw, 12, 16 ) );
		return false === $plain ? '' : $plain;
	}

	/**
	 * Base64url without padding.
	 *
	 * @param string $data Raw bytes.
	 * @return string
	 */
	public static function base64url_encode( $data ) {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Token encoding.
	}

	/**
	 * Decodes base64url.
	 *
	 * @param string $data Encoded string.
	 * @return string Raw bytes ('' when invalid).
	 */
	public static function base64url_decode( $data ) {
		$decoded = base64_decode( strtr( (string) $data, '-_', '+/' ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Token decoding.
		return false === $decoded ? '' : $decoded;
	}

	/**
	 * Encryption key derived from the site secret and WordPress salts.
	 *
	 * @return string 32 raw bytes.
	 */
	private static function encryption_key() {
		return hash_hmac( 'sha256', 'yallapp-encryption', self::secret() . wp_salt( 'auth' ), true );
	}
}
