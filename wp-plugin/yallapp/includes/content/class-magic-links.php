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
	 * The style handle for pages opened from the app (registered without a file).
	 */
	const STYLE_HANDLE = 'yallapp-app-view';

	/**
	 * Hides the site's header, footer and admin bar on pages opened from the app.
	 */
	const APP_VIEW_CSS = '#wpadminbar,header.site-header,.site-header,#masthead,footer.site-footer,.site-footer,#colophon,.tutor-header,.tutor-footer{display:none!important}html{margin-top:0!important}';

	/**
	 * Hooks the link handler and the in-app page styling.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'init', array( $this, 'consume' ), 1 );
		add_action( 'wp_enqueue_scripts', array( $this, 'app_view_styles' ), 99 );
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
	 * Signs the user in and redirects, once.
	 *
	 * This is not a form submission, so it has no nonce: the link itself is the credential. The
	 * token is 32 random bytes made by create() for one user after the app signed them in, it is
	 * stored only as a hash, it works for 5 minutes (TTL) and it is deleted the first time it is
	 * read, whether or not it was valid. A link that is unknown, used or expired signs no one in
	 * and only redirects to the home page; the target is checked with wp_validate_redirect().
	 *
	 * @return void
	 */
	public function consume() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- A one-time signed token, not a form: the token is the credential (see above).
		if ( empty( $_GET[ self::QUERY_ARG ] ) ) {
			return;
		}
		$token = sanitize_text_field( wp_unslash( $_GET[ self::QUERY_ARG ] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- One-time token, see above.
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
	 * Hides common site chrome on pages opened from the app: an inline style added to a
	 * registered handle without a file, on wp_enqueue_scripts.
	 *
	 * @return void
	 */
	public function app_view_styles() {
		if ( empty( $_COOKIE[ self::APP_VIEW ] ) ) {
			return;
		}
		wp_register_style( self::STYLE_HANDLE, false, array(), YALLAPP_VERSION );
		wp_enqueue_style( self::STYLE_HANDLE );
		wp_add_inline_style( self::STYLE_HANDLE, self::APP_VIEW_CSS );
	}
}
