<?php
/**
 * Availability rules for the app API.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_HTTP_Response;
use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Plugin;

/**
 * Blocks the app API during maintenance, when it is switched off or the license is
 * inactive (`/config` stays reachable so the app can explain why, and 31 the platform's
 * `/license/refresh` so a renewed plan reaches the site), and adds the plugin
 * version header to every response.
 */
class Gatekeeper {

	/**
	 * Routes that stay reachable.
	 */
	const ALWAYS_OPEN = array( '/yallapp/v1/config', '/yallapp/v1/license/refresh' );

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
	 * Hooks into REST dispatch.
	 *
	 * @return void
	 */
	public function register() {
		add_filter( 'rest_pre_dispatch', array( $this, 'pre_dispatch' ), 10, 3 );
		add_filter( 'rest_post_dispatch', array( $this, 'post_dispatch' ), 10, 3 );
	}

	/**
	 * Short-circuits blocked requests.
	 *
	 * @param mixed           $result  Earlier result.
	 * @param WP_REST_Server  $server  Server.
	 * @param WP_REST_Request $request Request.
	 * @return mixed
	 */
	public function pre_dispatch( $result, $server, $request ) {
		$route = $request->get_route();
		if ( null !== $result || 0 !== strpos( $route, '/yallapp/v1/' ) || in_array( $route, self::ALWAYS_OPEN, true ) ) {
			return $result;
		}
		$reason = $this->blocked_reason();
		if ( $reason ) {
			return Controller::error( $reason['code'], $reason['message'], 503, isset( $reason['contact'] ) ? array( 'contact' => $reason['contact'] ) : array() );
		}
		return $result;
	}

	/**
	 * Adds the plugin version header.
	 *
	 * @param WP_HTTP_Response $response Response.
	 * @param WP_REST_Server   $server   Server.
	 * @param WP_REST_Request  $request  Request.
	 * @return WP_HTTP_Response
	 */
	public function post_dispatch( $response, $server, $request ) {
		if ( 0 === strpos( $request->get_route(), '/yallapp/v1/' ) && $response instanceof WP_HTTP_Response ) {
			$response->header( 'X-Yallapp-Plugin-Version', YALLAPP_VERSION );
			$response->header( 'Cache-Control', 'no-store' );
		}
		return $response;
	}

	/**
	 * How app users reach the app's owner (`OwnerContact`): the app's name and the support
	 * WhatsApp number and email from the plugin settings.
	 *
	 * @return array{name: string, whatsapp: string|null, email: string|null}
	 */
	public function contact() {
		$settings = $this->plugin->settings();
		$name     = trim( (string) $settings->get( 'app_name' ) );
		$whatsapp = trim( (string) $settings->get( 'support_whatsapp' ) );
		$email    = trim( (string) $settings->get( 'support_email' ) );
		return array(
			'name'     => '' !== $name ? $name : html_entity_decode( get_bloginfo( 'name' ), ENT_QUOTES, 'UTF-8' ),
			'whatsapp' => '' !== $whatsapp ? $whatsapp : null,
			'email'    => is_email( $email ) ? $email : null,
		);
	}

	/**
	 * Why the API is unavailable, or null. A paused app (`license_inactive`, or
	 * `account_suspended` when the owner's Yallapp account is suspended) names the app and
	 * carries the owner's contact, so the app can say who can bring it back.
	 *
	 * @return array{code: string, message: string, contact?: array}|null
	 */
	public function blocked_reason() {
		$settings = $this->plugin->settings();
		if ( ! $settings->get( 'api_enabled' ) || $settings->get( 'maintenance' ) ) {
			$message = (string) $settings->get( 'maintenance_message' );
			return array(
				'code'    => 'maintenance',
				'message' => '' !== $message ? $message : __( 'The app is being updated. Please try again soon.', 'yallapp' ),
			);
		}
		if ( ! $this->plugin->license()->allows_api() ) {
			$status = $this->plugin->license()->status();
			return self::paused( (string) $status['status'], $this->contact() );
		}
		return null;
	}

	/**
	 * The error of a paused app: its plan isn't active (`license_inactive`), or the owner's
	 * Yallapp account is suspended (`account_suspended`). Never says "academy": every app
	 * type uses its own name.
	 *
	 * @param string $license_status The license status from the platform.
	 * @param array  $contact        OwnerContact.
	 * @return array{code: string, message: string, contact: array}
	 */
	public static function paused( $license_status, array $contact ) {
		return array(
			'code'    => 'suspended' === $license_status ? 'account_suspended' : 'license_inactive',
			/* translators: %1$s: the app's name. */
			'message' => sprintf( __( '%1$s is paused right now. Please contact %1$s to bring it back.', 'yallapp' ), $contact['name'] ),
			'contact' => $contact,
		);
	}
}
