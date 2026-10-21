<?php
/**
 * Bearer-token authentication for the plugin's REST routes.
 *
 * @package Yallapp
 */

namespace Yallapp\Auth;

defined( 'ABSPATH' ) || exit;

use WP_Error;

/**
 * Signs in the app's requests from the `Authorization: Bearer` header.
 */
class Request_Auth {

	/**
	 * Tokens.
	 *
	 * @var Tokens
	 */
	private $tokens;

	/**
	 * Device row of the current request, when signed in with a token.
	 *
	 * @var int
	 */
	private $device_row_id = 0;

	/**
	 * Whether a bearer token was sent but rejected.
	 *
	 * @var bool
	 */
	private $rejected = false;

	/**
	 * Constructor.
	 *
	 * @param Tokens $tokens Tokens.
	 */
	public function __construct( Tokens $tokens ) {
		$this->tokens = $tokens;
	}

	/**
	 * Hooks into WordPress authentication.
	 *
	 * @return void
	 */
	public function register() {
		add_filter( 'determine_current_user', array( $this, 'determine_current_user' ), 20 );
		add_filter( 'rest_authentication_errors', array( $this, 'authentication_errors' ), 20 );
	}

	/**
	 * Resolves the user from a bearer token on the plugin's routes.
	 *
	 * @param int|false $user_id User found by earlier handlers.
	 * @return int|false
	 */
	public function determine_current_user( $user_id ) {
		if ( ! $this->is_plugin_route() ) {
			return $user_id;
		}
		$token = self::bearer_token();
		if ( '' === $token ) {
			return $user_id;
		}
		$session = $this->tokens->validate_access( $token );
		if ( ! $session ) {
			$this->rejected = true;
			return false;
		}
		$this->device_row_id = $session['device_row_id'];
		return $session['user_id'];
	}

	/**
	 * Reports a rejected token, and skips the cookie nonce check for token requests.
	 *
	 * @param WP_Error|null|true $result Result from earlier handlers.
	 * @return WP_Error|null|true
	 */
	public function authentication_errors( $result ) {
		if ( $this->rejected ) {
			return new WP_Error( 'invalid_token', __( 'Your session has expired. Please sign in again.', 'yallapp' ), array( 'status' => 401 ) );
		}
		if ( $this->device_row_id ) {
			return true;
		}
		return $result;
	}

	/**
	 * Device row ID of the current token request, or 0.
	 *
	 * @return int
	 */
	public function device_row_id() {
		return $this->device_row_id;
	}

	/**
	 * The bearer token from the request headers.
	 *
	 * @return string
	 */
	public static function bearer_token() {
		$header = '';
		foreach ( array( 'HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION', 'HTTP_X_AUTHORIZATION' ) as $key ) {
			if ( ! empty( $_SERVER[ $key ] ) ) {
				$header = sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
				break;
			}
		}
		if ( '' === $header && function_exists( 'getallheaders' ) ) {
			foreach ( (array) getallheaders() as $name => $value ) {
				if ( 'authorization' === strtolower( (string) $name ) ) {
					$header = sanitize_text_field( (string) $value );
				}
			}
		}
		return preg_match( '/^Bearer\s+(\S+)$/i', $header, $m ) ? $m[1] : '';
	}

	/**
	 * Whether the current request targets the plugin's REST namespace.
	 *
	 * @return bool
	 */
	private function is_plugin_route() {
		// phpcs:disable WordPress.Security.NonceVerification -- Routing only.
		$uri  = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Only compared, never output.
		$get  = isset( $_GET['rest_route'] ) && is_string( $_GET['rest_route'] ) ? (string) wp_unslash( $_GET['rest_route'] ) : null; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Only compared.
		$post = isset( $_POST['rest_route'] ) && is_string( $_POST['rest_route'] ) ? (string) wp_unslash( $_POST['rest_route'] ) : null; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Only compared.
		// phpcs:enable
		return self::is_plugin_path( self::route_of( $uri, $get, $post, rest_get_url_prefix() ) );
	}

	/**
	 * 69 The REST route WordPress serves for a request, as it picks it: a `rest_route` sent in
	 * the body or the query wins over the address (WP::parse_request), else what follows the
	 * REST prefix in the address's path. The query string never counts, so
	 * `/wp-json/wp/v2/users?x=/wp-json/yallapp/` and `/wp-json/yallapp/v1/config?rest_route=/wp/v2/users`
	 * are WordPress's own routes, where the app's access token isn't accepted.
	 *
	 * @param string      $uri    REQUEST_URI.
	 * @param string|null $get    `rest_route` in the query, if any.
	 * @param string|null $post   `rest_route` in the body, if any.
	 * @param string      $prefix The REST prefix (`wp-json`).
	 * @return string The route, e.g. `/yallapp/v1/config`, or '' when it isn't a REST request.
	 */
	public static function route_of( $uri, $get, $post, $prefix ) {
		if ( null !== $post ) {
			return (string) $post;
		}
		if ( null !== $get ) {
			return (string) $get;
		}
		$path = (string) wp_parse_url( (string) $uri, PHP_URL_PATH );
		$base = '/' . trim( (string) $prefix, '/' ) . '/';
		$at   = strpos( $path, $base );
		return false === $at ? '' : substr( $path, $at + strlen( $base ) - 1 );
	}

	/**
	 * Whether a route is in the plugin's namespace.
	 *
	 * @param string $route Route.
	 * @return bool
	 */
	public static function is_plugin_path( $route ) {
		return 0 === strpos( '/' . ltrim( (string) $route, '/' ), '/yallapp/' );
	}
}
