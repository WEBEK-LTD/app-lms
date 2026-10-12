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
 * inactive (`/config` stays reachable so the app can explain why), and adds the plugin
 * version header to every response.
 */
class Gatekeeper {

	/**
	 * Routes that stay reachable.
	 */
	const ALWAYS_OPEN = array( '/yallapp/v1/config' );

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
			return Controller::error( $reason['code'], $reason['message'], 503 );
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
	 * Why the API is unavailable, or null.
	 *
	 * @return array{code: string, message: string}|null
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
			return array(
				'code'    => 'license_inactive',
				'message' => __( 'This app is not available right now. Please contact the academy.', 'yallapp' ),
			);
		}
		return null;
	}
}
