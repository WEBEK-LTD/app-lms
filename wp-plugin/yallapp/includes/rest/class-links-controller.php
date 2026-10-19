<?php
/**
 * What a page of the site is in the app (roadmap 48).
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Link_Paths;
use Yallapp\Link_Resolver;

/**
 * GET /links/resolve.
 */
class Links_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/links/resolve',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'resolve' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'url' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * GET /links/resolve.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function resolve( WP_REST_Request $request ) {
		$url = trim( (string) $request['url'] );
		if ( '' === $url || strlen( $url ) > 2048 || ! preg_match( '#^https?://#i', $url ) ) {
			return self::error( 'invalid_request', __( 'Send the whole address in url.', 'yallapp' ), 400 );
		}
		$resolver = new Link_Resolver( $this->plugin, new Link_Paths( $this->plugin ) );
		$response = $this->ok( $resolver->resolve( $url ) );
		$response->header( 'Cache-Control', 'private, max-age=300' );
		return $response;
	}
}
