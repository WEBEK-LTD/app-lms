<?php
/**
 * The app preview may send and read the headers it needs (roadmap 17).
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Rest\Cors;

class CorsTest extends TestCase {

	public function test_adds_the_app_headers_to_what_wordpress_allows() {
		$wordpress = array( 'Authorization', 'X-WP-Nonce', 'Content-Disposition', 'Content-MD5', 'Content-Type' );
		$allowed   = Cors::allowed_headers( $wordpress );
		$this->assertSame( $wordpress, array_slice( $allowed, 0, count( $wordpress ) ) );
		$this->assertContains( 'Accept-Language', $allowed );
		$this->assertContains( 'If-None-Match', $allowed );
		$this->assertContains( 'X-Yallapp-Preview', $allowed );
	}

	public function test_never_lists_a_header_twice_whatever_its_case() {
		$allowed = Cors::allowed_headers( array( 'authorization', 'accept-language' ) );
		$this->assertSame( array( 'authorization', 'accept-language', 'If-None-Match', 'X-Yallapp-Preview' ), $allowed );
		$this->assertSame( $allowed, Cors::allowed_headers( $allowed ) );
	}

	public function test_lets_the_app_read_the_etag_and_the_plugin_version() {
		$exposed = Cors::exposed_headers( array( 'X-WP-Total', 'X-WP-TotalPages', 'Link' ) );
		$this->assertSame( array( 'X-WP-Total', 'X-WP-TotalPages', 'Link', 'ETag', 'X-Yallapp-Plugin-Version' ), $exposed );
	}

	public function test_survives_another_plugin_breaking_the_list() {
		$this->assertSame( array( 'ETag', 'X-Yallapp-Plugin-Version' ), Cors::exposed_headers( null ) );
	}
}
