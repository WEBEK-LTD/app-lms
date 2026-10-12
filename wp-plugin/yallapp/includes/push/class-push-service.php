<?php
/**
 * Push notifications through Firebase Cloud Messaging.
 *
 * @package Yallapp
 */

namespace Yallapp\Push;

defined( 'ABSPATH' ) || exit;

use WP_Post;
use Yallapp\Crypto;
use Yallapp\Plugin;

/**
 * Sends new-lesson, announcement and enrollment notifications with the FCM HTTP v1 API.
 *
 * Sending happens in a cron event so publishing a lesson never waits on Firebase.
 */
class Push_Service {

	const SEND_HOOK  = 'yallapp_push_send';
	const BATCH_SIZE = 200;
	const TOKEN_KEY  = 'yallapp_fcm_access_token';

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Hooks into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'transition_post_status', array( $this, 'on_status_change' ), 10, 3 );
		add_action( 'tutor_after_enrolled', array( $this, 'on_enrolled' ), 10, 2 );
		add_action( self::SEND_HOOK, array( $this, 'send_batch' ), 10, 4 );
	}

	/**
	 * Whether a valid service account is saved.
	 *
	 * @return bool
	 */
	public function is_configured() {
		return null !== $this->account();
	}

	/**
	 * Queues a notification when a lesson or announcement is published.
	 *
	 * @param string  $new_status New status.
	 * @param string  $old_status Old status.
	 * @param WP_Post $post       Post.
	 * @return void
	 */
	public function on_status_change( $new_status, $old_status, $post ) {
		if ( 'publish' !== $new_status || 'publish' === $old_status || ! $post instanceof WP_Post || ! $this->is_configured() ) {
			return;
		}
		$lms = $this->plugin->lms();
		if ( ! $lms ) {
			return;
		}
		$types    = $lms->post_types();
		$settings = $this->plugin->settings();
		if ( $types['lesson'] === $post->post_type && $settings->get( 'notify_new_lesson' ) ) {
			$kind = 'new_lessons';
			$data = array(
				'type'      => 'new_lesson',
				'lesson_id' => (string) $post->ID,
			);
		} elseif ( isset( $types['announcement'] ) && $types['announcement'] === $post->post_type && $settings->get( 'notify_announcement' ) ) {
			$kind = 'announcements';
			$data = array( 'type' => 'announcement' );
		} else {
			return;
		}
		$course_id = $lms->course_of( $post->ID );
		if ( ! $course_id ) {
			return;
		}
		$data['course_id'] = (string) $course_id;
		$title             = 'new_lessons' === $kind
			/* translators: %s: course title. */
			? sprintf( __( 'New lesson in %s', 'yallapp' ), get_the_title( $course_id ) )
			: get_the_title( $course_id );
		$this->queue(
			$lms->student_ids( $course_id ),
			$kind,
			array(
				'title' => wp_strip_all_tags( $title ),
				'body'  => wp_strip_all_tags( get_the_title( $post ) ),
			),
			$data
		);
	}

	/**
	 * Queues a welcome notification when a student is enrolled.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return void
	 */
	public function on_enrolled( $course_id, $user_id ) {
		if ( ! $this->plugin->settings()->get( 'notify_enrollment' ) || ! $this->is_configured() ) {
			return;
		}
		$this->queue(
			array( (int) $user_id ),
			'',
			array(
				'title' => __( 'You are enrolled', 'yallapp' ),
				'body'  => wp_strip_all_tags( get_the_title( $course_id ) ),
			),
			array(
				'type'      => 'enrolled',
				'course_id' => (string) $course_id,
			)
		);
	}

	/**
	 * Splits recipients into cron batches.
	 *
	 * @param int[]  $user_ids     Recipients.
	 * @param string $kind         Preference key, or '' for always.
	 * @param array  $notification Title and body.
	 * @param array  $data         Data for the app (string values).
	 * @return void
	 */
	public function queue( array $user_ids, $kind, array $notification, array $data ) {
		$user_ids = array_values( array_unique( array_filter( array_map( 'absint', $user_ids ) ) ) );
		foreach ( array_chunk( $user_ids, self::BATCH_SIZE ) as $index => $batch ) {
			wp_schedule_single_event( time() + $index * 30, self::SEND_HOOK, array( $batch, $kind, $notification, $data ) );
		}
	}

	/**
	 * Sends one batch. Runs in cron.
	 *
	 * @param int[]  $user_ids     Recipients.
	 * @param string $kind         Preference key.
	 * @param array  $notification Title and body.
	 * @param array  $data         Data for the app.
	 * @return int Number of messages Firebase accepted.
	 */
	public function send_batch( $user_ids, $kind, $notification, $data ) {
		$account = $this->account();
		$token   = $account ? $this->access_token( $account ) : '';
		if ( '' === $token ) {
			return 0;
		}
		$sent = 0;
		$url  = 'https://fcm.googleapis.com/v1/projects/' . rawurlencode( $account['project_id'] ) . '/messages:send';
		foreach ( $this->plugin->devices()->push_tokens( (array) $user_ids, (string) $kind ) as $device_token ) {
			$response = wp_remote_post(
				$url,
				array(
					'timeout' => 10,
					'headers' => array(
						'Authorization' => 'Bearer ' . $token,
						'Content-Type'  => 'application/json',
					),
					'body'    => wp_json_encode( array( 'message' => self::message( $device_token, (array) $notification, (array) $data ) ) ),
				)
			);
			$code     = (int) wp_remote_retrieve_response_code( $response );
			if ( 200 === $code ) {
				++$sent;
			} elseif ( 404 === $code || false !== strpos( (string) wp_remote_retrieve_body( $response ), 'UNREGISTERED' ) ) {
				$this->plugin->devices()->forget_push_token( $device_token );
			}
		}
		return $sent;
	}

	/**
	 * FCM v1 message body.
	 *
	 * @param string $device_token FCM token.
	 * @param array  $notification Title and body.
	 * @param array  $data         Data for the app.
	 * @return array
	 */
	public static function message( $device_token, array $notification, array $data ) {
		return array(
			'token'        => $device_token,
			'notification' => array(
				'title' => (string) ( $notification['title'] ?? '' ),
				'body'  => (string) ( $notification['body'] ?? '' ),
			),
			'data'         => array_map( 'strval', $data ),
			'android'      => array( 'priority' => 'high' ),
			'apns'         => array( 'payload' => array( 'aps' => array( 'sound' => 'default' ) ) ),
		);
	}

	/**
	 * The decrypted service account.
	 *
	 * @return array{project_id: string, client_email: string, private_key: string}|null
	 */
	private function account() {
		$json = json_decode( Crypto::decrypt( (string) $this->plugin->settings()->get( 'firebase_service_account' ) ), true );
		if ( ! is_array( $json ) || empty( $json['project_id'] ) || empty( $json['client_email'] ) || empty( $json['private_key'] ) ) {
			return null;
		}
		return $json;
	}

	/**
	 * OAuth access token for FCM, cached for most of its hour.
	 *
	 * @param array $account Service account.
	 * @return string
	 */
	private function access_token( array $account ) {
		$cache_key = self::TOKEN_KEY . '_' . md5( $account['client_email'] );
		$cached    = get_transient( $cache_key );
		if ( is_string( $cached ) && '' !== $cached ) {
			return Crypto::decrypt( $cached );
		}
		$now       = time();
		$header    = Crypto::base64url_encode(
			(string) wp_json_encode(
				array(
					'alg' => 'RS256',
					'typ' => 'JWT',
				)
			)
		);
		$claims    = Crypto::base64url_encode(
			(string) wp_json_encode(
				array(
					'iss'   => $account['client_email'],
					'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
					'aud'   => 'https://oauth2.googleapis.com/token',
					'iat'   => $now,
					'exp'   => $now + 3600,
				)
			)
		);
		$key       = openssl_pkey_get_private( $account['private_key'] );
		$signature = '';
		if ( ! $key || ! openssl_sign( $header . '.' . $claims, $signature, $key, OPENSSL_ALGO_SHA256 ) ) {
			return '';
		}
		$response = wp_remote_post(
			'https://oauth2.googleapis.com/token',
			array(
				'timeout' => 10,
				'body'    => array(
					'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
					'assertion'  => $header . '.' . $claims . '.' . Crypto::base64url_encode( $signature ),
				),
			)
		);
		$body     = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$token    = is_array( $body ) && ! empty( $body['access_token'] ) ? (string) $body['access_token'] : '';
		if ( '' !== $token ) {
			set_transient( $cache_key, Crypto::encrypt( $token ), 50 * MINUTE_IN_SECONDS );
		}
		return $token;
	}
}
