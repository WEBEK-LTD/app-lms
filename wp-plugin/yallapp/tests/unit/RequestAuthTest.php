<?php
/**
 * 69 The app's access token is only accepted on the plugin's own REST routes, as WordPress
 * picks the route: never because the query string mentions them.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Auth\Request_Auth;

if ( ! function_exists( 'wp_parse_url' ) ) {
	/**
	 * Minimal stand-in for WordPress's URL parser.
	 *
	 * @param string $url       URL.
	 * @param int    $component Component.
	 * @return mixed
	 */
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url
	}
}

class RequestAuthTest extends TestCase {

	/**
	 * Whether a request is the plugin's.
	 *
	 * @param string      $uri  REQUEST_URI.
	 * @param string|null $get  `rest_route` in the query.
	 * @param string|null $post `rest_route` in the body.
	 * @return bool
	 */
	private static function plugin( $uri, $get = null, $post = null ) {
		return Request_Auth::is_plugin_path( Request_Auth::route_of( $uri, $get, $post, 'wp-json' ) );
	}

	public function test_the_plugins_routes_are_recognised() {
		$this->assertTrue( self::plugin( '/wp-json/yallapp/v1/config' ) );
		$this->assertTrue( self::plugin( '/academy/wp-json/yallapp/v1/me/courses?page=2' ) );
		$this->assertTrue( self::plugin( '/index.php/wp-json/yallapp/v1/lessons/12' ) );
		$this->assertTrue( self::plugin( '/?rest_route=/yallapp/v1/config', '/yallapp/v1/config' ) );
		$this->assertTrue( self::plugin( '/index.php', 'yallapp/v1/config' ) );
		$this->assertSame( '/yallapp/v1/config', Request_Auth::route_of( '/wp-json/yallapp/v1/config?x=1', null, null, 'wp-json' ) );
	}

	public function test_the_query_string_never_makes_another_route_the_plugins() {
		$this->assertFalse( self::plugin( '/wp-json/wp/v2/users/me?x=/wp-json/yallapp/' ) );
		$this->assertFalse( self::plugin( '/wp-json/wp/v2/users?search=%2Fwp-json%2Fyallapp%2F' ) );
		$this->assertFalse( self::plugin( '/wp-admin/admin-ajax.php?u=/wp-json/yallapp/v1' ) );
		$this->assertFalse( self::plugin( '/wp-json/wp/v2/posts/wp-json/yallapp/v1' ) );
	}

	public function test_a_rest_route_parameter_wins_as_it_does_in_wordpress() {
		// WordPress serves the parameter's route, not the address's.
		$this->assertFalse( self::plugin( '/wp-json/yallapp/v1/config?rest_route=/wp/v2/users/me', '/wp/v2/users/me' ) );
		$this->assertFalse( self::plugin( '/wp-json/yallapp/v1/config', null, '/wp/v2/users/me' ) );
		$this->assertFalse( self::plugin( '/?rest_route=/yallapp/v1/config', '/yallapp/v1/config', '/wp/v2/users' ) );
		$this->assertFalse( self::plugin( '/?rest_route=/wp/v2/users&x=/yallapp/', '/wp/v2/users' ) );
	}

	public function test_other_requests_are_not_rest_routes() {
		$this->assertSame( '', Request_Auth::route_of( '/shop/', null, null, 'wp-json' ) );
		$this->assertFalse( self::plugin( '/yallapp/v1/config' ) );
		$this->assertFalse( self::plugin( '' ) );
	}
}
