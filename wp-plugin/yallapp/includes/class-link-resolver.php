<?php
/**
 * What a page of the site is in the app (roadmap 48).
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

use WP_Post;

/**
 * `GET /links/resolve` (docs/api/openapi.yaml, tag Links): the app opened one of the site's
 * own addresses and asks what it is. A course, a lesson, a product, a product category, a post
 * or a page with a booking form, when it is public and published; null for anything else,
 * and the app then shows the address in its in-app browser.
 */
class Link_Resolver {

	/** What the answer may name (docs/api/app-links.json, `resolved_kinds`). */
	const KINDS = array( 'course', 'lesson', 'product', 'product_category', 'article', 'bookings', 'service' );

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * The site's own pages.
	 *
	 * @var Link_Paths
	 */
	private $paths;

	/**
	 * Constructor.
	 *
	 * @param Plugin     $plugin Plugin.
	 * @param Link_Paths $paths  The site's own pages.
	 */
	public function __construct( Plugin $plugin, Link_Paths $paths ) {
		$this->plugin = $plugin;
		$this->paths  = $paths;
	}

	/**
	 * What an address is.
	 *
	 * @param string $url The whole address.
	 * @return array{kind: string|null, id: string|null}
	 */
	public function resolve( $url ) {
		$none  = self::answer( null, null );
		$parts = wp_parse_url( (string) $url );
		if ( ! is_array( $parts ) || ! self::same_site( $parts, (string) wp_parse_url( home_url( '/' ), PHP_URL_HOST ) ) ) {
			return $none;
		}
		$path  = '/' . ltrim( rawurldecode( (string) ( $parts['path'] ?? '/' ) ), '/' );
		$query = array();
		wp_parse_str( (string) ( $parts['query'] ?? '' ), $query );
		$home = Link_Paths::home_path();
		if ( 0 !== strpos( rtrim( $path, '/' ) . '/', $home ) || Link_Paths::is_excluded( $path, $query, $home, $this->paths->excluded_page_paths() ) ) {
			return $none;
		}
		foreach ( $this->paths->entries() as $entry ) {
			if ( ! Link_Paths::glob( $entry['pattern'], $path ) && ! Link_Paths::glob( $entry['pattern'], $path . '/' ) ) {
				continue;
			}
			$found = $entry['taxonomy'] ? $this->term( $entry, $path ) : $this->post( $entry, $url, $path );
			if ( $found['kind'] ) {
				return $found;
			}
		}
		return $none;
	}

	/**
	 * A post the address names, for an entry: `url_to_postid` first, then the last part of the
	 * path as a slug of the entry's post types (Tutor LMS's lessons sit under their course).
	 *
	 * @param array  $entry Entry of Link_Paths::entries().
	 * @param string $url   Address.
	 * @param string $path  Its path.
	 * @return array{kind: string|null, id: string|null}
	 */
	private function post( array $entry, $url, $path ) {
		$post = get_post( url_to_postid( $url ) );
		if ( ! $post || ! in_array( $post->post_type, $entry['post_types'], true ) ) {
			$slug = basename( untrailingslashit( $path ) );
			$post = null;
			foreach ( $entry['post_types'] as $type ) {
				$post = '' !== $slug ? get_page_by_path( $slug, OBJECT, $type ) : null;
				if ( $post ) {
					break;
				}
			}
		}
		if ( ! $post instanceof WP_Post || ! self::is_public( $post ) ) {
			return self::answer( null, null );
		}
		return $this->kind_of( $post, $entry );
	}

	/**
	 * A post's kind in the app.
	 *
	 * @param WP_Post $post  Post.
	 * @param array   $entry Entry it was found by.
	 * @return array{kind: string|null, id: string|null}
	 */
	private function kind_of( WP_Post $post, array $entry ) {
		$lms = $this->plugin->lms();
		if ( 'bookings' === $entry['kind'] ) {
			$adapter = $this->plugin->bookings();
			$service = $adapter ? Link_Paths::booking_service( $post->post_content, Link_Paths::BOOKING_SHORTCODES[ $adapter->id() ] ?? array() ) : 0;
			return $service ? self::answer( 'service', $service ) : self::answer( 'bookings', null );
		}
		if ( $lms ) {
			$types = $lms->post_types();
			if ( $types['course'] === $post->post_type ) {
				return self::answer( 'course', $post->ID );
			}
			if ( $types['lesson'] === $post->post_type ) {
				return self::answer( 'lesson', $post->ID );
			}
		}
		if ( 'product' === $post->post_type ) {
			return self::answer( 'product', $post->ID );
		}
		if ( 'post' === $post->post_type ) {
			return self::answer( 'article', $post->ID );
		}
		return self::answer( null, null );
	}

	/**
	 * A term the address names (a product category).
	 *
	 * @param array  $entry Entry.
	 * @param string $path  Path.
	 * @return array{kind: string|null, id: string|null}
	 */
	private function term( array $entry, $path ) {
		$slug = sanitize_title( basename( untrailingslashit( $path ) ) );
		$term = '' !== $slug ? get_term_by( 'slug', $slug, $entry['taxonomy'] ) : false;
		return $term && ! is_wp_error( $term ) ? self::answer( $entry['kind'], $term->term_id ) : self::answer( null, null );
	}

	/**
	 * Whether a post is one anyone may see: published, no password, of a public type.
	 *
	 * @param WP_Post $post Post.
	 * @return bool
	 */
	private static function is_public( WP_Post $post ) {
		return 'publish' === $post->post_status && '' === (string) $post->post_password && is_post_type_viewable( $post->post_type );
	}

	/**
	 * Whether an address is on this site: http or https, the site's host (with or without
	 * `www.`). Pure.
	 *
	 * @param array  $parts     wp_parse_url() of the address.
	 * @param string $home_host The site's host.
	 * @return bool
	 */
	public static function same_site( array $parts, $home_host ) {
		$scheme = strtolower( (string) ( $parts['scheme'] ?? '' ) );
		$host   = strtolower( (string) ( $parts['host'] ?? '' ) );
		$strip  = static function ( $host ) {
			return 0 === strpos( $host, 'www.' ) ? substr( $host, 4 ) : $host;
		};
		return in_array( $scheme, array( 'http', 'https' ), true ) && '' !== $host && $strip( $host ) === $strip( strtolower( (string) $home_host ) );
	}

	/**
	 * The answer. Pure.
	 *
	 * @param string|null     $kind Kind.
	 * @param int|string|null $id   Id.
	 * @return array{kind: string|null, id: string|null}
	 */
	public static function answer( $kind, $id ) {
		$kind = in_array( $kind, self::KINDS, true ) ? $kind : null;
		return array(
			'kind' => $kind,
			'id'   => null === $kind || null === $id ? null : (string) $id,
		);
	}
}
