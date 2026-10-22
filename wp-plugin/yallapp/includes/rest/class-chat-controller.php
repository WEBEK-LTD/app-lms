<?php
/**
 * The app's chat with the business, on Yallapp.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use Yallapp\License\Chat_Notify;

/**
 * 77 The chat lives on Yallapp's hosted API (`Config.chat.base_url`). People sign in on this
 * site, so the app asks here for a chat token (`POST /chat/session`), which the plugin gets
 * from Yallapp for the signed-in person. Yallapp tells the site of new messages
 * (`POST /chat/notify`, signed with the license key) and the plugin pushes them, as the site
 * keeps its people's push tokens. Nothing of the messages is stored here.
 */
class Chat_Controller extends Controller {

	/**
	 * Registers the routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/chat/session',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'session' ),
				'permission_callback' => array( $this, 'require_user' ),
			)
		);
		$this->route(
			'/chat/notify',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'notify' ),
				// The signature is the permission: checked in the callback so errors keep the contract's shape.
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * `Config.chat`, or null when the app has no chat (its plan, or the owner turned it off).
	 *
	 * @param \Yallapp\Plugin $plugin Plugin.
	 * @return array{base_url: string, session: string, groups: bool}|null
	 */
	public static function config( $plugin ) {
		$license = $plugin->license();
		$chat    = $license->status()['chat'] ?? null;
		if ( ! is_array( $chat ) || ! $license->has_feature( 'chat' ) ) {
			return null;
		}
		return array(
			'base_url' => (string) $chat['base_url'],
			'session'  => 'site',
			'groups'   => ! empty( $chat['groups'] ),
		);
	}

	/**
	 * POST /chat/session: an hour's chat token for the signed-in person.
	 *
	 * @return WP_REST_Response
	 */
	public function session() {
		$config = self::config( $this->plugin );
		if ( ! $config ) {
			return self::error( 'chat_not_available', __( 'Chat isn\'t available in this app.', 'yallapp' ), 403 );
		}
		$user_id = get_current_user_id();
		$user    = get_userdata( $user_id );
		$name    = $user ? trim( html_entity_decode( (string) $user->display_name, ENT_QUOTES, 'UTF-8' ) ) : '';
		$image   = get_avatar_url( $user_id, array( 'size' => 192 ) );
		$result  = $this->plugin->license()->chat_session( $user_id, '' !== $name ? mb_substr( $name, 0, 120 ) : __( 'Student', 'yallapp' ), is_string( $image ) ? $image : '', $config['groups'] ? $this->courses( $user_id ) : array() );
		if ( is_wp_error( $result ) ) {
			$status = (int) ( $result->get_error_data()['status'] ?? 0 );
			if ( 403 === $status || 429 === $status ) {
				return self::from_wp_error( $result );
			}
			return self::error( 'chat_unavailable', __( 'Chat can\'t be reached right now. Try again in a moment.', 'yallapp' ), 503 );
		}
		if ( ! is_string( $result['token'] ?? null ) || ! is_string( $result['expires_at'] ?? null ) || ! is_string( $result['base_url'] ?? null ) ) {
			return self::error( 'chat_unavailable', __( 'Chat can\'t be reached right now. Try again in a moment.', 'yallapp' ), 503 );
		}
		return $this->ok(
			array(
				'token'      => $result['token'],
				'expires_at' => $result['expires_at'],
				'base_url'   => $result['base_url'],
			)
		);
	}

	/**
	 * The courses the person is enrolled in, for their course groups (at most 500).
	 *
	 * @param int $user_id User ID.
	 * @return array
	 */
	private function courses( $user_id ) {
		$lms = $this->plugin->lms();
		if ( ! $lms ) {
			return array();
		}
		$courses = array();
		foreach ( array_slice( array_map( 'absint', (array) $lms->enrolled_course_ids( $user_id ) ), 0, 500 ) as $course_id ) {
			$title = trim( html_entity_decode( (string) get_the_title( $course_id ), ENT_QUOTES, 'UTF-8' ) );
			if ( ! $course_id || '' === $title ) {
				continue;
			}
			$image     = get_the_post_thumbnail_url( $course_id, 'medium' );
			$courses[] = array(
				'id'        => $course_id,
				'title'     => mb_substr( $title, 0, 200 ),
				'image_url' => is_string( $image ) && '' !== $image ? $image : null,
			);
		}
		return $courses;
	}

	/**
	 * POST /chat/notify: Yallapp tells the site of a message for some of its people.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function notify( WP_REST_Request $request ) {
		$key          = (string) $this->plugin->settings()->get( 'license_key' );
		$notification = Chat_Notify::verify( $key, $request->get_body(), time() );
		if ( null === $notification ) {
			return self::error( 'invalid_signature', __( 'This request is not signed for this site.', 'yallapp' ), 401 );
		}
		$push = $this->plugin->push();
		if ( $push->is_configured() && $notification['user_ids'] ) {
			$push->queue(
				$notification['user_ids'],
				'',
				array(
					'title' => $notification['title'],
					'body'  => $notification['body'],
				),
				array(
					'type'            => 'chat',
					'conversation_id' => $notification['conversation_id'],
				)
			);
			// Sent now, not at the next visit to the site.
			spawn_cron();
		}
		return new WP_REST_Response( null, 202 );
	}
}
