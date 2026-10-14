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
 * Sends new-lesson, announcement and enrollment notifications with the FCM HTTP v1 API,
 * and saves each one to the students' inbox (Inbox), with or without Firebase.
 *
 * Sending happens in a cron event so publishing a lesson never waits on Firebase.
 */
class Push_Service {

	const SEND_HOOK  = 'yallapp_push_send';
	const BATCH_SIZE = 200;
	const TOKEN_KEY  = 'yallapp_fcm_access_token';

	/**
	 * News & blog apps: a new post is announced a minute after it's published, once the
	 * editor's "In the app" box (saved after the status changes, or in a second request by
	 * the block editor) has said whether to.
	 */
	const POST_HOOK     = 'yallapp_notify_post';
	const POST_DELAY    = 60;
	const NO_PUSH_META  = '_yallapp_no_push';
	const NOTIFIED_META = '_yallapp_notified';

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
		add_action( self::SEND_HOOK, array( $this, 'send_batch' ), 10, 4 );
		add_action( self::POST_HOOK, array( $this, 'notify_post' ) );
		$lms = $this->plugin->lms();
		if ( $lms ) {
			$lms->listen( array( $this, 'on_enrolled' ), array( $this, 'on_answered' ) );
		}
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
		if ( 'publish' !== $new_status || 'publish' === $old_status || ! $post instanceof WP_Post ) {
			return;
		}
		if ( 'post' === $post->post_type ) {
			if ( $this->plugin->settings()->get( 'notify_new_post' ) && ! get_post_meta( $post->ID, self::NOTIFIED_META, true ) ) {
				wp_schedule_single_event( time() + self::POST_DELAY, self::POST_HOOK, array( (int) $post->ID ) );
			}
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
		$notification = array(
			'title' => wp_strip_all_tags( $title ),
			'body'  => wp_strip_all_tags( get_the_title( $post ) ),
		);
		$this->plugin->inbox()->add( $data['type'], Inbox::AUDIENCE_COURSE, $course_id, $notification['title'], $notification['body'], $course_id, 'new_lesson' === $data['type'] ? $post->ID : 0 );
		if ( $this->is_configured() ) {
			$this->queue( $lms->student_ids( $course_id ), $kind, $notification, $data );
		}
	}

	/**
	 * Tells app users about a new post (News & blog apps): saved to everyone's inbox and
	 * pushed to devices that allow news. Runs in cron, once per post; nothing is sent when the
	 * setting was turned off since, the post isn't public any more, or its "In the app" box
	 * says not to.
	 *
	 * @param int $post_id Post ID.
	 * @return bool Whether it was sent.
	 */
	public function notify_post( $post_id ) {
		$post = get_post( (int) $post_id );
		if ( ! \Yallapp\News\Articles::readable( $post ) || ! $this->plugin->settings()->get( 'notify_new_post' ) ) {
			return false;
		}
		if ( get_post_meta( $post->ID, self::NO_PUSH_META, true ) || get_post_meta( $post->ID, self::NOTIFIED_META, true ) ) {
			return false;
		}
		update_post_meta( $post->ID, self::NOTIFIED_META, time() );
		$notification = self::post_notification(
			html_entity_decode( wp_strip_all_tags( get_the_title( $post ) ), ENT_QUOTES, 'UTF-8' ),
			(string) \Yallapp\News\Articles::excerpt_of( $post->post_excerpt, $post->post_content )
		);
		$this->plugin->inbox()->add( 'article', Inbox::AUDIENCE_ALL, 0, $notification['title'], $notification['body'], 0, 0, 0, $post->ID );
		if ( $this->is_configured() && $this->plugin->license()->has_feature( 'push' ) ) {
			$this->queue(
				$this->plugin->devices()->push_user_ids(),
				'news',
				$notification,
				array(
					'type'       => 'article',
					'article_id' => (string) $post->ID,
				)
			);
		}
		return true;
	}

	/**
	 * A new post's notification: its title and the start of its excerpt, cut to what phones show. Pure.
	 *
	 * @param string $title   Title.
	 * @param string $excerpt Excerpt.
	 * @return array{title: string, body: string}
	 */
	public static function post_notification( $title, $excerpt ) {
		$cut  = static function ( $text, $max ) {
			$text = trim( (string) $text );
			return mb_strlen( $text ) <= $max ? $text : rtrim( mb_substr( $text, 0, $max - 1 ) ) . "\u{2026}";
		};
		$body = '' !== trim( $excerpt ) ? $excerpt : $title;
		return array(
			'title' => $cut( $title, 65 ),
			'body'  => $cut( $body, 240 ),
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
		if ( ! $this->plugin->settings()->get( 'notify_enrollment' ) ) {
			return;
		}
		$notification = array(
			'title' => __( 'You are enrolled', 'yallapp' ),
			'body'  => wp_strip_all_tags( get_the_title( $course_id ) ),
		);
		$this->plugin->inbox()->add( 'enrolled', Inbox::AUDIENCE_USER, $user_id, $notification['title'], $notification['body'], $course_id );
		if ( $this->is_configured() ) {
			$this->queue(
				array( (int) $user_id ),
				'',
				$notification,
				array(
					'type'      => 'enrolled',
					'course_id' => (string) $course_id,
				)
			);
		}
	}

	/**
	 * Tells a student an instructor answered their question, on the website or in the app.
	 * The LMS adapter calls it from its own Q&A hook.
	 *
	 * @param int $question_id Question ID.
	 * @param int $asker_id    Student who asked.
	 * @param int $course_id   Course.
	 * @param int $replier_id  Who replied.
	 * @return void
	 */
	public function on_answered( $question_id, $asker_id, $course_id, $replier_id ) {
		if ( ! $asker_id || (int) $asker_id === (int) $replier_id || ! $this->plugin->settings()->get( 'notify_qna_answer' ) ) {
			return;
		}
		$notification = array(
			'title' => __( 'Your question was answered', 'yallapp' ),
			'body'  => wp_strip_all_tags( get_the_title( $course_id ) ),
		);
		$this->plugin->inbox()->add( 'qna_answer', Inbox::AUDIENCE_USER, (int) $asker_id, $notification['title'], $notification['body'], (int) $course_id, 0, (int) $question_id );
		if ( $this->is_configured() ) {
			$this->queue(
				array( (int) $asker_id ),
				'',
				$notification,
				array(
					'type'        => 'qna_answer',
					'course_id'   => (string) $course_id,
					'question_id' => (string) $question_id,
				)
			);
		}
	}

	/**
	 * Sends an announcement written in the settings page: saved to the inbox,
	 * and pushed when Firebase is set up.
	 *
	 * @param string $title     Title.
	 * @param string $body      Message.
	 * @param int    $course_id The course whose students get it, or 0 for everyone.
	 * @return int Students it was pushed to.
	 */
	public function announce( $title, $body, $course_id = 0 ) {
		$lms = $this->plugin->lms();
		$this->plugin->inbox()->add( 'announcement', $course_id ? Inbox::AUDIENCE_COURSE : Inbox::AUDIENCE_ALL, $course_id, $title, $body, $course_id );
		if ( ! $this->is_configured() ) {
			return 0;
		}
		$users = $course_id && $lms ? $lms->student_ids( $course_id ) : $this->plugin->devices()->push_user_ids();
		$data  = array( 'type' => 'announcement' );
		if ( $course_id ) {
			$data['course_id'] = (string) $course_id;
		}
		$this->queue(
			$users,
			'announcements',
			array(
				'title' => $title,
				'body'  => $body,
			),
			$data
		);
		return count( $users );
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
