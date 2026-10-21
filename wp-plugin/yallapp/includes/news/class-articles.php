<?php
/**
 * The site's posts as articles, for News & blog apps.
 *
 * @package Yallapp
 */

namespace Yallapp\News;

defined( 'ABSPATH' ) || exit;

use WP_Post;
use WP_Query;
use Yallapp\Content\Html_Processor;
use Yallapp\Content\Lesson_Renderer;
use Yallapp\Settings;

/**
 * Reads published posts (never private, password-protected or other post types) and
 * shapes them as the app API's ArticleSummary, Article and NewsCategory (docs/api/openapi.yaml,
 * tag News). Sticky posts are the top stories. Bodies are rendered and processed exactly
 * like lesson content.
 */
class Articles {

	const HOME_FEATURED = 5;
	const HOME_LATEST   = 20;
	const HOME_RAIL     = 10;
	const MAX_IDS       = 30;

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Lesson renderer, for the body.
	 *
	 * @var Lesson_Renderer
	 */
	private $renderer;

	/**
	 * Constructor.
	 *
	 * @param Settings        $settings Settings.
	 * @param Lesson_Renderer $renderer Lesson renderer.
	 */
	public function __construct( Settings $settings, Lesson_Renderer $renderer ) {
		$this->settings = $settings;
		$this->renderer = $renderer;
	}

	/**
	 * WP_Query arguments for a list of articles. Pure, so it can be unit tested.
	 *
	 * @param array $args page, per_page, category (term ID), search, featured, ids, sticky (sticky post IDs), orderby (newest or popular).
	 * @return array|null Query arguments, or null when nothing can match (featured without sticky posts).
	 */
	public static function query_args( array $args ) {
		$per_page = max( 1, min( 50, (int) ( $args['per_page'] ?? 20 ) ) );
		$query    = array(
			'post_type'           => 'post',
			'post_status'         => 'publish',
			'has_password'        => false,
			'ignore_sticky_posts' => true,
			'posts_per_page'      => $per_page,
			'paged'               => max( 1, (int) ( $args['page'] ?? 1 ) ),
			'orderby'             => array(
				'date' => 'DESC',
				'ID'   => 'DESC',
			),
		);
		$ids      = array();
		foreach ( (array) ( $args['ids'] ?? array() ) as $id ) {
			if ( is_scalar( $id ) && (int) $id > 0 ) {
				$ids[] = (int) $id;
			}
		}
		$ids = array_slice( array_values( array_unique( $ids ) ), 0, self::MAX_IDS );
		if ( $ids ) {
			$query['post__in'] = $ids;
			$query['orderby']  = 'post__in';
			return $query;
		}
		if ( ! empty( $args['featured'] ) ) {
			$sticky = array_values( array_filter( array_map( 'intval', (array) ( $args['sticky'] ?? array() ) ) ) );
			if ( ! $sticky ) {
				return null;
			}
			$query['post__in'] = $sticky;
		}
		if ( ! empty( $args['category'] ) ) {
			$query['cat'] = (int) $args['category'];
		}
		$search = trim( (string) ( $args['search'] ?? '' ) );
		if ( '' !== $search ) {
			$query['s'] = $search;
		}
		if ( 'popular' === ( $args['orderby'] ?? 'newest' ) ) {
			$query['orderby'] = array(
				'comment_count' => 'DESC',
				'date'          => 'DESC',
			);
		}
		return $query;
	}

	/**
	 * A short plain-text excerpt: the post's own, else the first words of its content. Pure.
	 *
	 * @param string $excerpt The post's excerpt.
	 * @param string $content The post's content.
	 * @param int    $max     Most characters.
	 * @return string|null
	 */
	public static function excerpt_of( $excerpt, $content, $max = 200 ) {
		$text = '' !== trim( (string) $excerpt ) ? (string) $excerpt : (string) $content;
		// Shortcodes and block comments aren't words; tags go, entities are decoded.
		$text = preg_replace( '/\[[^\]]*\]|<!--.*?-->/s', ' ', $text );
		$text = html_entity_decode( (string) preg_replace( '/<[^>]*>/', ' ', (string) $text ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$text = trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
		if ( '' === $text ) {
			return null;
		}
		if ( mb_strlen( $text ) <= $max ) {
			return $text;
		}
		$cut   = mb_substr( $text, 0, $max );
		$space = mb_strrpos( $cut, ' ' );
		if ( false !== $space && $space > $max * 0.6 ) {
			$cut = mb_substr( $cut, 0, $space );
		}
		return rtrim( $cut, " ,.;:-\u{2013}\u{2014}" ) . "\u{2026}";
	}

	/**
	 * Published articles.
	 *
	 * @param array $args page, per_page, category, search, featured, ids, orderby.
	 * @return array{items: array[], total: int} ArticleSummary shapes.
	 */
	public function articles( array $args ) {
		$args['sticky'] = get_option( 'sticky_posts', array() );
		$query          = self::query_args( $args );
		if ( null === $query ) {
			return array(
				'items' => array(),
				'total' => 0,
			);
		}
		$result = new WP_Query( $query );
		$items  = array();
		foreach ( $result->posts as $post ) {
			if ( $post instanceof WP_Post ) {
				$items[] = $this->summary( $post );
			}
		}
		return array(
			'items' => $items,
			'total' => (int) $result->found_posts,
		);
	}

	/**
	 * A published article with its body, or null.
	 *
	 * @param int $id Post ID.
	 * @return array|null Article shape.
	 */
	public function article( $id ) {
		$post = get_post( (int) $id );
		if ( ! self::readable( $post ) ) {
			return null;
		}
		$processed = Html_Processor::process( Lesson_Renderer::the_content( $post ), (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
		$mode      = $this->renderer->mode( $post, $processed['needs_webview'] );
		return array_merge(
			$this->summary( $post ),
			array(
				'render_mode' => $mode,
				'html'        => 'native' === $mode ? $processed['html'] : null,
				// A public post: its own page, nobody needs to be signed in.
				'webview_url' => 'webview' === $mode ? (string) get_permalink( $post ) : null,
				'embeds'      => 'native' === $mode ? $processed['embeds'] : array(),
			)
		);
	}

	/**
	 * Whether the app may show a post: a published post, not password-protected.
	 *
	 * @param mixed $post Post.
	 * @return bool
	 */
	public static function readable( $post ) {
		return $post instanceof WP_Post && 'post' === $post->post_type && 'publish' === $post->post_status && '' === (string) $post->post_password;
	}

	/**
	 * The ArticleSummary shape.
	 *
	 * @param WP_Post $post Post.
	 * @return array
	 */
	public function summary( WP_Post $post ) {
		$image      = get_the_post_thumbnail_url( $post, 'large' );
		$categories = array();
		foreach ( get_the_category( $post->ID ) as $term ) {
			$categories[] = array(
				'id'   => (string) $term->term_id,
				'name' => html_entity_decode( (string) $term->name, ENT_QUOTES, 'UTF-8' ),
			);
		}
		$author = $this->settings->get( 'news_show_author' ) ? (string) get_the_author_meta( 'display_name', (int) $post->post_author ) : '';
		$date   = '0000-00-00 00:00:00' !== $post->post_date_gmt ? $post->post_date_gmt : get_gmt_from_date( $post->post_date );
		return array(
			'id'           => (string) $post->ID,
			'title'        => html_entity_decode( wp_strip_all_tags( get_the_title( $post ) ), ENT_QUOTES, 'UTF-8' ),
			'excerpt'      => self::excerpt_of( $post->post_excerpt, $post->post_content ),
			'author'       => '' !== $author ? $author : null,
			'published_at' => mysql2date( 'Y-m-d\TH:i:s\Z', $date, false ),
			'image_url'    => $image ? $image : null,
			'categories'   => $categories,
			'url'          => (string) get_permalink( $post ),
			'featured'     => is_sticky( $post->ID ),
		);
	}

	/**
	 * Categories with published posts, in name order. The default category ("Uncategorized")
	 * is left out, as in page blocks.
	 *
	 * @return array[] NewsCategory shapes.
	 */
	public function categories() {
		$found = get_terms(
			array(
				'taxonomy'   => 'category',
				'hide_empty' => true,
				// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- A few IDs.
				'exclude'    => array( (int) get_option( 'default_category' ) ),
			)
		);
		$out   = array();
		foreach ( is_array( $found ) ? $found : array() as $term ) {
			$count = $this->count_in( (int) $term->term_id );
			if ( $count > 0 ) {
				$out[] = array(
					'id'    => (string) $term->term_id,
					'name'  => html_entity_decode( (string) $term->name, ENT_QUOTES, 'UTF-8' ),
					'count' => $count,
				);
			}
		}
		return $out;
	}

	/**
	 * Published posts the app may show in a category (the term count also has private ones).
	 *
	 * @param int $term_id Category.
	 * @return int
	 */
	private function count_in( $term_id ) {
		$query = new WP_Query(
			array(
				'post_type'      => 'post',
				'post_status'    => 'publish',
				'has_password'   => false,
				'cat'            => $term_id,
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);
		return (int) $query->found_posts;
	}

	/**
	 * GET /news/home: top stories (sticky posts, else the newest), the latest without
	 * repeating them, and a rail per category.
	 *
	 * @return array NewsHome shape.
	 */
	public function home() {
		$featured = $this->articles(
			array(
				'featured' => true,
				'per_page' => self::HOME_FEATURED,
			)
		)['items'];
		if ( ! $featured ) {
			$featured = $this->articles( array( 'per_page' => self::HOME_FEATURED ) )['items'];
		}
		$shown  = array_column( $featured, 'id' );
		$latest = array();
		foreach ( $this->articles( array( 'per_page' => self::HOME_LATEST + count( $shown ) ) )['items'] as $item ) {
			if ( ! in_array( $item['id'], $shown, true ) && count( $latest ) < self::HOME_LATEST ) {
				$latest[] = $item;
			}
		}
		$rails = array();
		foreach ( $this->categories() as $category ) {
			$rails[] = array(
				'category' => $category,
				'articles' => $this->articles(
					array(
						'category' => (int) $category['id'],
						'per_page' => self::HOME_RAIL,
					)
				)['items'],
			);
		}
		return array(
			'featured' => $featured,
			'latest'   => $latest,
			'rails'    => $rails,
		);
	}
}
