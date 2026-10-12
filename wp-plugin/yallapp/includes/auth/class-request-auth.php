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
		$uri   = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
		$route = isset( $_GET['rest_route'] ) ? sanitize_text_field( wp_unslash( $_GET['rest_route'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Routing only.
		$base  = '/' . rest_get_url_prefix() . '/yallapp/';
		return false !== strpos( rawurldecode( $uri ), $base ) || 0 === strpos( $route, '/yallapp/' );
	}
}
