<?php
/**
 * The signature on Yallapp's "send a campaign" request.
 *
 * @package Yallapp
 */

namespace Yallapp\License;

defined( 'ABSPATH' ) || exit;

/**
 * 85.4 `POST /campaigns/send` (docs/api/openapi.yaml, sendCampaign): the platform signs the
 * timestamp and the SHA-256 of the campaign's JSON, exactly as sent, with the site's license
 * key, like the chat's notify. Pure.
 */
class Campaign_Request {

	/**
	 * What is signed, before the timestamp.
	 */
	const PREFIX = 'yallapp-campaign:';

	/**
	 * The signature: lowercase hex HMAC-SHA256 of `yallapp-campaign:<timestamp>:<sha256 of the
	 * campaign JSON>`, keyed with the license key in capitals.
	 *
	 * @param string $key           License key.
	 * @param int    $timestamp     Unix time in seconds.
	 * @param string $campaign_json The campaign as sent.
	 * @return string
	 */
	public static function sign( $key, $timestamp, $campaign_json ) {
		return hash_hmac( 'sha256', self::PREFIX . (int) $timestamp . ':' . hash( 'sha256', (string) $campaign_json ), strtoupper( trim( (string) $key ) ) );
	}

	/**
	 * The campaign of a signed request, checked: null when the body isn't the platform's shape,
	 * the key is empty, the timestamp is more than 5 minutes from now or the signature doesn't
	 * match.
	 *
	 * @param string $key The saved license key ('' when none).
	 * @param string $raw The request body as received.
	 * @param int    $now Unix time now.
	 * @return array{send_id: int, title: string, body: string, link: string|null, image_url: string|null}|null
	 */
	public static function verify( $key, $raw, $now ) {
		if ( '' === trim( (string) $key ) || ! is_string( $raw ) || strlen( $raw ) > 16384 ) {
			return null;
		}
		if ( 1 !== preg_match( '/^\{"timestamp":(\d{1,12}),"signature":"([0-9a-f]{64})","campaign":(\{.*\})\}$/s', $raw, $match ) ) {
			return null;
		}
		$timestamp = (int) $match[1];
		if ( abs( (int) $now - $timestamp ) > Refresh_Signature::MAX_AGE || ! hash_equals( self::sign( $key, $timestamp, $match[3] ), $match[2] ) ) {
			return null;
		}
		return self::campaign( json_decode( $match[3], true ) );
	}

	/**
	 * A campaign's fields, or null when one is missing or wrong.
	 *
	 * @param mixed $data Decoded campaign.
	 * @return array{send_id: int, title: string, body: string, link: string|null, image_url: string|null}|null
	 */
	public static function campaign( $data ) {
		if ( ! is_array( $data ) || ! is_int( $data['send_id'] ?? null ) || $data['send_id'] < 1 ) {
			return null;
		}
		$title = $data['title'] ?? null;
		$body  = $data['body'] ?? null;
		if ( ! is_string( $title ) || '' === trim( $title ) || ! is_string( $body ) || '' === trim( $body ) ) {
			return null;
		}
		$link  = self::https( $data['link'] ?? null );
		$image = self::https( $data['image_url'] ?? null );
		if ( false === $link || false === $image ) {
			return null;
		}
		return array(
			'send_id'   => $data['send_id'],
			'title'     => mb_substr( $title, 0, 65 ),
			'body'      => mb_substr( $body, 0, 240 ),
			'link'      => $link,
			'image_url' => $image,
		);
	}

	/**
	 * An https address up to 500 characters, null for none, false for anything else.
	 *
	 * @param mixed $value Value.
	 * @return string|null|false
	 */
	private static function https( $value ) {
		if ( null === $value ) {
			return null;
		}
		if ( ! is_string( $value ) || strlen( $value ) > 500 || 0 !== strpos( $value, 'https://' ) || 1 === preg_match( '/\s/', $value ) ) {
			return false;
		}
		return $value;
	}
}
