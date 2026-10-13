<?php
/**
 * Pages and bottom tabs.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;

/**
 * GET /pages and GET /pages/{slug}: the layout published in the dashboard, or the default
 * pages, with the site's content filled in and texts in the language the app asks for.
 */
class Pages_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/pages',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'navigation' ),
				'permission_callback' => '__return_true',
				'args'                => array( 'platform' => self::platform_arg() ),
			)
		);
		$this->route(
			'/pages/(?P<slug>[^/]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'page' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'     => array(
						'type'     => 'string',
						'pattern'  => '^[a-z0-9-]{1,64}$',
						'required' => true,
					),
					'platform' => self::platform_arg(),
				),
			)
		);
	}

	/**
	 * GET /pages.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function navigation( WP_REST_Request $request ) {
		$pages      = $this->plugin->pages();
		$language   = $pages->language( $request->get_header( 'accept_language' ) );
		$navigation = $pages->navigation( $language, (string) $request['platform'] );
		$etag       = '"' . $navigation['version'] . '"';
		$response   = self::matches( (string) $request->get_header( 'if_none_match' ), $navigation['version'] )
			? $this->ok( null, 304 )
			: $this->ok( $navigation );
		$response->header( 'ETag', $etag );
		$response->header( 'Vary', 'Accept-Language' );
		return $response;
	}

	/**
	 * GET /pages/{slug}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function page( WP_REST_Request $request ) {
		$pages    = $this->plugin->pages();
		$language = $pages->language( $request->get_header( 'accept_language' ) );
		$page     = $pages->page( (string) $request['slug'], $language, (string) $request['platform'], get_current_user_id() );
		$response = $page ? $this->ok( $page ) : self::error( 'not_found', __( 'This page does not exist.', 'yallapp' ), 404 );
		$response->header( 'Vary', 'Accept-Language' );
		return $response;
	}

	/**
	 * Whether If-None-Match names the version. Accepts the bare version, a quoted or weak
	 * entity tag, a list of them, or *.
	 *
	 * @param string $header  If-None-Match.
	 * @param string $version Current version.
	 * @return bool
	 */
	private static function matches( $header, $version ) {
		if ( trim( trim( $header ), '"' ) === $version ) {
			return true;
		}
		foreach ( explode( ',', $header ) as $tag ) {
			$tag = trim( $tag );
			if ( 0 === strpos( $tag, 'W/' ) ) {
				$tag = substr( $tag, 2 );
			}
			$tag = trim( $tag, '"' );
			if ( '' !== $tag && ( '*' === $tag || $tag === $version ) ) {
				return true;
			}
		}
		return false;
	}
}
