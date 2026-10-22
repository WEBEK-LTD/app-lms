<?php
/**
 * The signature on Yallapp's "push a chat message" request.
 *
 * @package Yallapp
 */

namespace Yallapp\License;

defined( 'ABSPATH' ) || exit;

/**
 * 77 `POST /chat/notify` (docs/api/openapi.yaml, notifyChat): the platform signs the timestamp
 * and the SHA-256 of the notification's JSON, exactly as sent, with the site's license key.
 * The plugin checks it on the raw body, so nothing is re-encoded before it is checked. Pure.
 */
class Chat_Notify {

	/**
	 * What is signed, before the timestamp.
	 */
	const PREFIX = 'yallapp-chat-notify:';

	/**
	 * At most this many people per request.
	 */
	const MAX_USERS = 500;

	/**
	 * The signature: lowercase hex HMAC-SHA256 of `yallapp-chat-notify:<timestamp>:<sha256 of the
	 * notification JSON>`, keyed with the license key in capitals.
	 *
	 * @param string $key               License key.
	 * @param int    $timestamp         Unix time in seconds.
	 * @param string $notification_json The notification as sent.
	 * @return string
	 */
	public static function sign( $key, $timestamp, $notification_json ) {
		return hash_hmac( 'sha256', self::PREFIX . (int) $timestamp . ':' . hash( 'sha256', (string) $notification_json ), strtoupper( trim( (string) $key ) ) );
	}

	/**
	 * The notification of a signed request, checked: null when the body isn't the platform's
	 * shape, the key is empty, the timestamp is more than 5 minutes from now or the signature
	 * doesn't match.
	 *
	 * @param string $key  The saved license key ('' when none).
	 * @param string $raw  The request body as received.
	 * @param int    $now  Unix time now.
	 * @return array{user_ids: int[], title: string, body: string, conversation_id: string}|null
	 */
	public static function verify( $key, $raw, $now ) {
		if ( '' === trim( (string) $key ) || ! is_string( $raw ) || strlen( $raw ) > 65536 ) {
			return null;
		}
		if ( 1 !== preg_match( '/^\{"timestamp":(\d{1,12}),"signature":"([0-9a-f]{64})","notification":(\{.*\})\}$/s', $raw, $match ) ) {
			return null;
		}
		$timestamp = (int) $match[1];
		if ( abs( (int) $now - $timestamp ) > Refresh_Signature::MAX_AGE || ! hash_equals( self::sign( $key, $timestamp, $match[3] ), $match[2] ) ) {
			return null;
		}
		return self::notification( json_decode( $match[3], true ) );
	}

	/**
	 * A notification's fields, or null when one is missing or wrong.
	 *
	 * @param mixed $data Decoded notification.
	 * @return array{user_ids: int[], title: string, body: string, conversation_id: string}|null
	 */
	public static function notification( $data ) {
		if ( ! is_array( $data ) || ! is_array( $data['user_ids'] ?? null ) || count( $data['user_ids'] ) > self::MAX_USERS ) {
			return null;
		}
		$ids = array();
		foreach ( $data['user_ids'] as $id ) {
			if ( ! is_int( $id ) || $id < 1 ) {
				return null;
			}
			$ids[] = $id;
		}
		$title        = $data['title'] ?? null;
		$body         = $data['body'] ?? null;
		$conversation = $data['conversation_id'] ?? null;
		if ( ! is_string( $title ) || ! is_string( $body ) || ! is_string( $conversation ) || 1 !== preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $conversation ) ) {
			return null;
		}
		return array(
			'user_ids'        => array_values( array_unique( $ids ) ),
			'title'           => mb_substr( $title, 0, 120 ),
			'body'            => mb_substr( $body, 0, 200 ),
			'conversation_id' => $conversation,
		);
	}
}
