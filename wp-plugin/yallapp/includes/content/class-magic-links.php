<?php
/**
 * One-time sign-in links.
 *
 * @package Yallapp
 */

namespace Yallapp\Content;

defined( 'ABSPATH' ) || exit;

use Yallapp\Crypto;

/**
 * Short-lived, single-use links that sign the app's student in on the website and open a
 * page there: checkout, a lesson in web view mode, or a quiz with question types the app
 * can't show natively.
 */
class Magic_Links {

	const QUERY_ARG = 'yallapp_link';
	const TTL       = 300;
	const APP_VIEW  = 'yallapp_app_view';

	/**
	 * Hooks the link handler and the in-app page styling.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'init', array( $this, 'consume' ), 1 );
		add_action( 'wp_head', array( $this, 'app_view_styles' ), 99 );
	}

	/**
	 * Creates a link.
	 *
	 * @param int    $user_id  User to sign in.
	 * @param string $target   URL on this site.
	 * @param bool   $app_view Hide the site's header and footer.
	 * @return string
	 */
	public static function create( $user_id, $target, $app_view ) {
		$token = Crypto::token( 32 );
		set_transient(
			'yallapp_link_' . Crypto::hash( $token ),
			array(
				'user_id'  => (int) $user_id,
				'target'   => (string) $target,
				'app_view' => (bool) $app_view,
			),
			self::TTL
		);
		return add_query_arg( self::QUERY_ARG, rawurlencode( $token ), home_url( '/' ) );
	}

	/**
	 * 124.9 A page of this site to open signed in from the app: [url] when it is on the
	 * site's own host ([home], `www.` either way), over https or the site's own scheme, on
	 * the site's port, with no user name or password in it. Given back on the site's own
	 * host, so the redirect after signing in keeps it; null for any other address.
	 *
	 * @param string $url  The page the app opens.
	 * @param string $home The site's address (`home_url()`).
	 * @return string|null
	 */
	public static function site_target( $url, $home ) {
		$url = trim( (string) $url );
		if ( '' === $url || strlen( $url ) > 2048 || preg_match( '/[\x00-\x20\x7f\\\\]/', $url ) ) {
			return null;
		}
		$target = wp_parse_url( $url );
		$site   = wp_parse_url( (string) $home );
		if ( ! is_array( $target ) || ! is_array( $site ) || empty( $target['host'] ) || empty( $site['host'] ) || empty( $target['scheme'] ) || empty( $site['scheme'] ) ) {
			return null;
		}
		if ( isset( $target['user'] ) || isset( $target['pass'] ) ) {
			return null;
		}
		$scheme      = strtolower( $target['scheme'] );
		$site_scheme = strtolower( $site['scheme'] );
		if ( 'https' !== $scheme && $site_scheme !== $scheme ) {
			return null;
		}
		$bare = function ( $host ) {
			$host = strtolower( $host );
			return 0 === strpos( $host, 'www.' ) ? substr( $host, 4 ) : $host;
		};
		if ( $bare( $target['host'] ) !== $bare( $site['host'] ) || ( $target['port'] ?? null ) !== ( $site['port'] ?? null ) ) {
			return null;
		}
		$path = $target['path'] ?? '/';
		return $scheme . '://' . strtolower( $site['host'] ) . ( isset( $site['port'] ) ? ':' . $site['port'] : '' )
			. ( '' === $path || '/' !== $path[0] ? '/' . $path : $path )
			. ( isset( $target['query'] ) ? '?' . $target['query'] : '' )
			. ( isset( $target['fragment'] ) ? '#' . $target['fragment'] : '' );
	}

	/**
	 * Signs the user in and redirects, once.
	 *
	 * @return void
	 */
	public function consume() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- The token is the credential.
		if ( empty( $_GET[ self::QUERY_ARG ] ) ) {
			return;
		}
		$token = sanitize_text_field( wp_unslash( $_GET[ self::QUERY_ARG ] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$key   = 'yallapp_link_' . Crypto::hash( $token );
		$link  = get_transient( $key );
		delete_transient( $key );
		nocache_headers();
		if ( ! is_array( $link ) || ! get_userdata( $link['user_id'] ) ) {
			wp_safe_redirect( home_url( '/' ) );
			exit;
		}
		wp_set_current_user( $link['user_id'] );
		wp_set_auth_cookie( $link['user_id'], false, is_ssl() );
		if ( $link['app_view'] ) {
			setcookie( self::APP_VIEW, '1', 0, COOKIEPATH ? COOKIEPATH : '/', COOKIE_DOMAIN, is_ssl(), true );
		}
		wp_safe_redirect( wp_validate_redirect( $link['target'], home_url( '/' ) ) );
		exit;
	}

	/**
	 * Hides common site chrome on pages opened from the app.
	 *
	 * @return void
	 */
	public function app_view_styles() {
		if ( empty( $_COOKIE[ self::APP_VIEW ] ) ) {
			return;
		}
		echo '<style id="yallapp-app-view">#wpadminbar,header.site-header,.site-header,#masthead,footer.site-footer,.site-footer,#colophon,.tutor-header,.tutor-footer{display:none!important}html{margin-top:0!important}</style>';
	}
}
