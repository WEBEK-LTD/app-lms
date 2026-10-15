<?php
/**
 * Huawei Push Kit (server API v1).
 *
 * @package Yallapp
 */

namespace Yallapp\Push;

defined( 'ABSPATH' ) || exit;

use Yallapp\Crypto;

/**
 * Sends notifications to Huawei phones without Google Play services (roadmap 36),
 * with the app ID and app secret from AppGallery Connect. Same title, body and data
 * as the FCM message, so the app handles both the same way.
 */
class Hms_Sender {

	const TOKEN_URL = 'https://oauth-login.cloud.huawei.com/oauth2/v3/token';
	const PUSH_URL  = 'https://push-api.cloud.huawei.com/v1/';
	const TOKEN_KEY = 'yallapp_hms_access_token';
	/** Push Kit takes up to 1,000 tokens per request. */
	const BATCH = 1000;

	/**
	 * App ID.
	 *
	 * @var string
	 */
	private $app_id;

	/**
	 * App secret.
	 *
	 * @var string
	 */
	private $app_secret;

	/**
	 * Constructor.
	 *
	 * @param string $app_id     AppGallery Connect app ID.
	 * @param string $app_secret App secret.
	 */
	public function __construct( $app_id, $app_secret ) {
		$this->app_id     = (string) $app_id;
		$this->app_secret = (string) $app_secret;
	}

	/**
	 * Sends one notification to Huawei tokens.
	 *
	 * @param string[] $tokens       Push Kit tokens.
	 * @param array    $notification Title and body.
	 * @param array    $data         Data for the app.
	 * @return array{sent: int, invalid: string[]}
	 */
	public function send( array $tokens, array $notification, array $data ) {
		$result = array(
			'sent'    => 0,
			'invalid' => array(),
		);
		$tokens = array_values( array_unique( array_filter( array_map( 'strval', $tokens ) ) ) );
		if ( ! $tokens ) {
			return $result;
		}
		$access = $this->access_token();
		if ( '' === $access ) {
			return $result;
		}
		foreach ( array_chunk( $tokens, self::BATCH ) as $batch ) {
			$response          = wp_remote_post(
				self::PUSH_URL . rawurlencode( $this->app_id ) . '/messages:send',
				array(
					'timeout' => 10,
					'headers' => array(
						'Authorization' => 'Bearer ' . $access,
						'Content-Type'  => 'application/json; charset=UTF-8',
					),
					'body'    => wp_json_encode( self::message( $batch, $notification, $data ) ),
				)
			);
			$answer            = self::result( $batch, json_decode( (string) wp_remote_retrieve_body( $response ), true ) );
			$result['sent']   += $answer['sent'];
			$result['invalid'] = array_merge( $result['invalid'], $answer['invalid'] );
		}
		return $result;
	}

	/**
	 * The Push Kit message: a notification that opens the app, with the data as a JSON
	 * string (Push Kit's form). Pure.
	 *
	 * @param string[] $tokens       Tokens.
	 * @param array    $notification Title and body.
	 * @param array    $data         Data for the app.
	 * @return array
	 */
	public static function message( array $tokens, array $notification, array $data ) {
		$title = (string) ( $notification['title'] ?? '' );
		$body  = (string) ( $notification['body'] ?? '' );
		return array(
			'validate_only' => false,
			'message'       => array(
				'data'         => (string) wp_json_encode( array_map( 'strval', $data ) ),
				'notification' => array(
					'title' => $title,
					'body'  => $body,
				),
				'android'      => array(
					'urgency'      => 'HIGH',
					'notification' => array(
						'title'         => $title,
						'body'          => $body,
						'default_sound' => true,
						'click_action'  => array( 'type' => 3 ),
					),
				),
				'token'        => array_values( $tokens ),
			),
		);
	}

	/**
	 * What Push Kit's answer means: 80000000 all sent, 80100000 some tokens refused
	 * (listed in the message), 80300007 all tokens invalid. Pure.
	 *
	 * @param string[]   $tokens Tokens sent.
	 * @param array|null $answer Decoded answer.
	 * @return array{sent: int, invalid: string[]}
	 */
	public static function result( array $tokens, $answer ) {
		$code = is_array( $answer ) ? (string) ( $answer['code'] ?? '' ) : '';
		if ( '80000000' === $code ) {
			return array(
				'sent'    => count( $tokens ),
				'invalid' => array(),
			);
		}
		if ( '80100000' === $code ) {
			$msg     = json_decode( (string) ( $answer['msg'] ?? '' ), true );
			$refused = is_array( $msg ) && isset( $msg['illegal_tokens'] ) && is_array( $msg['illegal_tokens'] ) ? array_values( array_intersect( $tokens, array_map( 'strval', $msg['illegal_tokens'] ) ) ) : array();
			return array(
				'sent'    => count( $tokens ) - count( $refused ),
				'invalid' => $refused,
			);
		}
		if ( '80300007' === $code ) {
			return array(
				'sent'    => 0,
				'invalid' => array_values( $tokens ),
			);
		}
		return array(
			'sent'    => 0,
			'invalid' => array(),
		);
	}

	/**
	 * OAuth access token (client credentials), cached for most of its life.
	 *
	 * @return string
	 */
	private function access_token() {
		$cache_key = self::TOKEN_KEY . '_' . md5( $this->app_id );
		$cached    = get_transient( $cache_key );
		if ( is_string( $cached ) && '' !== $cached ) {
			return Crypto::decrypt( $cached );
		}
		$response = wp_remote_post(
			self::TOKEN_URL,
			array(
				'timeout' => 10,
				'body'    => array(
					'grant_type'    => 'client_credentials',
					'client_id'     => $this->app_id,
					'client_secret' => $this->app_secret,
				),
			)
		);
		$body     = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$token    = is_array( $body ) && ! empty( $body['access_token'] ) ? (string) $body['access_token'] : '';
		if ( '' !== $token ) {
			$life = isset( $body['expires_in'] ) ? (int) $body['expires_in'] : 3600;
			set_transient( $cache_key, Crypto::encrypt( $token ), max( 60, $life - 300 ) );
		}
		return $token;
	}
}
