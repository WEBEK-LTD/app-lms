<?php
/**
 * Links that open the app (roadmap 46).
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

use Yallapp\License\License_Client;

/**
 * Android App Links and iOS Universal Links on the client's own site (docs/api/openapi.yaml,
 * tag Links; the table is docs/api/app-links.json):
 *
 * - `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` at the root of
 *   the domain, as JSON, built from the license status (`LicenseStatus.app_links`), so phones
 *   open `<site>/a/<kind>/<id>` in the app;
 * - `<site>/a/<kind>/<id>` itself, for visitors without the app: a redirect to the item's own
 *   page (its permalink), or to the home page when it has none or isn't public.
 */
class App_Links {

	/**
	 * Kinds of links and the shape of their id (docs/api/app-links.json).
	 */
	const KINDS = array(
		'course'   => 'number',
		'product'  => 'number',
		'service'  => 'number',
		'listing'  => 'number',
		'article'  => 'text',
		'event'    => 'number',
		'campaign' => 'number',
		'page'     => 'slug',
	);

	const ID_PATTERNS = array(
		'number' => '/^[1-9][0-9]{0,17}$/',
		'text'   => '/^[A-Za-z0-9_-]{1,64}$/',
		'slug'   => '/^[a-z0-9-]{1,64}$/',
	);

	const ASSET_LINKS = '/.well-known/assetlinks.json';
	const APPLE       = '/.well-known/apple-app-site-association';

	/**
	 * License client.
	 *
	 * @var License_Client
	 */
	private $license;

	/**
	 * Constructor.
	 *
	 * @param License_Client $license License client.
	 */
	public function __construct( License_Client $license ) {
		$this->license = $license;
	}

	/**
	 * Hooks into WordPress: before WordPress reads the request as a page.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'parse_request', array( $this, 'handle' ), 0 );
	}

	/**
	 * Serves the link files and the links themselves; anything else goes on to WordPress.
	 *
	 * @return void
	 */
	public function handle() {
		$uri  = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Only its path is compared below.
		$path = (string) wp_parse_url( $uri, PHP_URL_PATH );
		$home = (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH );
		$file = self::file_for( $path, $this->license->status()['app_links'] ?? null, $home );
		if ( null !== $file ) {
			status_header( 200 );
			header( 'Content-Type: application/json' );
			header( 'Cache-Control: public, max-age=3600' );
			header( 'Access-Control-Allow-Origin: *' );
			echo wp_json_encode( $file, JSON_UNESCAPED_SLASHES );
			exit;
		}
		$link = self::parse_path( $path, $home );
		if ( null !== $link ) {
			wp_safe_redirect( $this->target( $link['kind'], $link['id'] ), 302, 'Yallapp' );
			exit;
		}
	}

	/**
	 * Where a link goes on the website: the item's permalink when it is a public, published post
	 * of a public type, else the home page.
	 *
	 * @param string $kind Kind.
	 * @param string $id   Id.
	 * @return string
	 */
	public function target( $kind, $id ) {
		if ( 'page' !== $kind && ctype_digit( (string) $id ) ) {
			$post = get_post( (int) $id );
			if ( $post && 'publish' === $post->post_status && '' === (string) $post->post_password && is_post_type_viewable( $post->post_type ) ) {
				$url = get_permalink( $post );
				if ( $url ) {
					return $url;
				}
			}
		}
		return home_url( '/' );
	}

	/**
	 * A link on this site, `<home path>a/<kind>/<id>`, or null. Pure.
	 *
	 * @param string $path      Request path.
	 * @param string $home_path The site's path, like `/` or `/learn/`.
	 * @return array{kind: string, id: string}|null
	 */
	public static function parse_path( $path, $home_path = '/' ) {
		$base = rtrim( (string) $home_path, '/' ) . '/a/';
		$path = rtrim( (string) $path, '/' );
		if ( 0 !== strpos( $path, $base ) ) {
			return null;
		}
		$parts = explode( '/', substr( $path, strlen( $base ) ) );
		if ( 2 !== count( $parts ) || ! isset( self::KINDS[ $parts[0] ] ) ) {
			return null;
		}
		$id = rawurldecode( $parts[1] );
		if ( ! preg_match( self::ID_PATTERNS[ self::KINDS[ $parts[0] ] ], $id ) ) {
			return null;
		}
		return array(
			'kind' => $parts[0],
			'id'   => $id,
		);
	}

	/**
	 * The link file a request asks for, or null (another path, a site in a folder, or nothing
	 * known yet: WordPress then answers as usual). Pure.
	 *
	 * @param string     $path      Request path.
	 * @param array|null $links     `LicenseStatus.app_links` as the license client keeps it.
	 * @param string     $home_path The site's path.
	 * @return array|null
	 */
	public static function file_for( $path, $links, $home_path = '/' ) {
		if ( ! is_array( $links ) ) {
			return null;
		}
		if ( self::ASSET_LINKS === $path && ! empty( $links['android'] ) ) {
			return self::asset_links( $links['android'] );
		}
		if ( self::APPLE === $path && ! empty( $links['ios'] ) ) {
			return self::apple_association( $links['ios'], $home_path );
		}
		return null;
	}

	/**
	 * `assetlinks.json`: the app's package and its fingerprints. Pure.
	 *
	 * @param array $android `package_name` and `sha256_cert_fingerprints`.
	 * @return array
	 */
	public static function asset_links( array $android ) {
		return array(
			array(
				'relation' => array( 'delegate_permission/common.handle_all_urls' ),
				'target'   => array(
					'namespace'                => 'android_app',
					'package_name'             => (string) $android['package_name'],
					'sha256_cert_fingerprints' => array_values( (array) $android['sha256_cert_fingerprints'] ),
				),
			),
		);
	}

	/**
	 * `apple-app-site-association`: the app for `<home path>a/*` only. Pure.
	 *
	 * @param array  $ios       `app_ids`.
	 * @param string $home_path The site's path.
	 * @return array
	 */
	public static function apple_association( array $ios, $home_path = '/' ) {
		return array(
			'applinks' => array(
				'details' => array(
					array(
						'appIDs'     => array_values( (array) $ios['app_ids'] ),
						'components' => array( array( '/' => rtrim( (string) $home_path, '/' ) . '/a/*' ) ),
					),
				),
			),
		);
	}

	/**
	 * `LicenseStatus.app_links` checked: only well-formed packages, fingerprints and app IDs are
	 * kept, so nothing else ever reaches the files. Pure.
	 *
	 * @param mixed $value From the platform.
	 * @return array{android: array|null, ios: array|null}|null
	 */
	public static function sanitize( $value ) {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$android = null;
		if ( isset( $value['android'] ) && is_array( $value['android'] ) ) {
			$package      = (string) ( $value['android']['package_name'] ?? '' );
			$fingerprints = array_values(
				array_filter(
					(array) ( $value['android']['sha256_cert_fingerprints'] ?? array() ),
					static function ( $f ) {
						return is_string( $f ) && preg_match( '/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/', $f );
					}
				)
			);
			if ( preg_match( '/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/', $package ) && $fingerprints ) {
				$android = array(
					'package_name'             => $package,
					'sha256_cert_fingerprints' => array_slice( $fingerprints, 0, 4 ),
				);
			}
		}
		$ios = null;
		if ( isset( $value['ios'] ) && is_array( $value['ios'] ) ) {
			$ids = array_values(
				array_filter(
					(array) ( $value['ios']['app_ids'] ?? array() ),
					static function ( $id ) {
						return is_string( $id ) && preg_match( '/^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/', $id );
					}
				)
			);
			if ( $ids ) {
				$ios = array( 'app_ids' => array_slice( $ids, 0, 4 ) );
			}
		}
		return $android || $ios ? array(
			'android' => $android,
			'ios'     => $ios,
		) : null;
	}
}
