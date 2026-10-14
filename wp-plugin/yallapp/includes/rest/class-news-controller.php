<?php
/**
 * Articles for News & blog apps.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Plugin;

/**
 * GET /news/home, /news/categories, /news/articles and /news/articles/{article_id}
 * (docs/api/openapi.yaml, tag News): the site's published posts. Reading is public.
 */
class News_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/news/home',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'home' ),
				'permission_callback' => '__return_true',
			)
		);
		$this->route(
			'/news/categories',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'categories' ),
				'permission_callback' => '__return_true',
			)
		);
		$this->route(
			'/news/articles',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'articles' ),
				'permission_callback' => '__return_true',
				'args'                => array_merge(
					self::page_args(),
					array(
						'category' => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
						'search'   => array(
							'type'      => 'string',
							'maxLength' => 100,
						),
						'featured' => array(
							'type'    => 'boolean',
							'default' => false,
						),
						'ids'      => array(
							'type'    => 'string',
							'pattern' => '^[0-9]+(,[0-9]+)*$',
						),
					)
				),
			)
		);
		$this->route(
			'/news/articles/(?P<article_id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'article' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * Config.news.
	 *
	 * @param Plugin $plugin Plugin.
	 * @return array
	 */
	public static function config( Plugin $plugin ) {
		$settings = $plugin->settings();
		return self::config_of(
			(bool) $settings->get( 'news_show_author' ),
			(bool) $settings->get( 'news_show_dates' ),
			(bool) $settings->get( 'notify_new_post' ) && $plugin->push()->is_configured() && $plugin->license()->has_feature( 'push' )
		);
	}

	/**
	 * Config.news from its parts. Pure.
	 *
	 * @param bool $show_author Whether articles show their author.
	 * @param bool $show_dates  Whether articles show their date.
	 * @param bool $push        Whether new posts are pushed.
	 * @return array
	 */
	public static function config_of( $show_author, $show_dates, $push ) {
		return array(
			'show_author'        => (bool) $show_author,
			'show_dates'         => (bool) $show_dates,
			'breaking_news_push' => (bool) $push,
		);
	}

	/**
	 * GET /news/home.
	 *
	 * @return \WP_REST_Response
	 */
	public function home() {
		return $this->ok( $this->plugin->articles()->home() );
	}

	/**
	 * GET /news/categories.
	 *
	 * @return \WP_REST_Response
	 */
	public function categories() {
		return $this->ok( array( 'items' => $this->plugin->articles()->categories() ) );
	}

	/**
	 * GET /news/articles.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function articles( WP_REST_Request $request ) {
		$ids    = (string) $request['ids'];
		$result = $this->plugin->articles()->articles(
			array(
				'page'     => (int) $request['page'],
				'per_page' => (int) $request['per_page'],
				'category' => (int) $request['category'],
				'search'   => (string) $request['search'],
				'featured' => (bool) $request['featured'],
				'ids'      => '' !== $ids ? explode( ',', $ids ) : array(),
			)
		);
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
	}

	/**
	 * GET /news/articles/{article_id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function article( WP_REST_Request $request ) {
		$article = $this->plugin->articles()->article( (int) $request['article_id'] );
		if ( null === $article ) {
			return self::error( 'not_found', __( 'Article not found.', 'yallapp' ), 404 );
		}
		return $this->ok( $article );
	}
}
