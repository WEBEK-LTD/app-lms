<?php
/**
 * 48 The site's own pages that open the app: patterns, Android paths, what stays on the website.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\App_Links;
use Yallapp\Link_Paths;
use Yallapp\Link_Resolver;

class LinkPathsTest extends TestCase {

	public function test_permalink_structures_as_ios_patterns() {
		$this->assertSame( '/*', Link_Paths::structure_pattern( '/%postname%/' ) );
		$this->assertSame( '/blog/*', Link_Paths::structure_pattern( '/blog/%postname%/' ) );
		$this->assertSame( '/????/??/*', Link_Paths::structure_pattern( '/%year%/%monthnum%/%postname%/' ) );
		$this->assertSame( '/archives/*', Link_Paths::structure_pattern( '/archives/%post_id%' ) );
		$this->assertSame( '/courses/*', Link_Paths::structure_pattern( '/courses/' ) );
		$this->assertSame( '/shop/*', Link_Paths::structure_pattern( '/shop/%product_cat%/' ) );
		$this->assertSame( '/learn/courses/*', Link_Paths::structure_entry( 'course', '/courses/', '/learn/', array( 'courses' ) )['pattern'] );
	}

	public function test_android_gets_only_bases_with_a_fixed_folder() {
		$this->assertNull( Link_Paths::fixed_prefix( '/%postname%/' ) );
		$this->assertNull( Link_Paths::fixed_prefix( '/%year%/%monthnum%/%postname%/' ) );
		$this->assertSame( '/blog/', Link_Paths::fixed_prefix( '/blog/%postname%/' ) );
		$this->assertSame( '/courses/', Link_Paths::fixed_prefix( '/courses/' ) );
		$this->assertSame( '/shop/', Link_Paths::fixed_prefix( '/shop/%product_cat%/' ) );
		$this->assertSame( '/news/', Link_Paths::fixed_prefix( '/news/%year%/%postname%/' ) );
		$this->assertNull( Link_Paths::valid_prefix( '/a b/' ) );
		$this->assertNull( Link_Paths::valid_prefix( '/x/../' ) );
		$this->assertNull( Link_Paths::valid_prefix( '/' . str_repeat( 'x', 100 ) . '/' ) );
		$entries = array(
			array( 'prefix' => '/courses/' ),
			array( 'prefix' => '/courses/lessons/' ),
			array( 'prefix' => null ),
			array( 'prefix' => '/product-category/' ),
			array( 'prefix' => '/product/' ),
			array( 'prefix' => '/product/' ),
		);
		// Sorted, without repeats and without paths inside another one.
		$this->assertSame( array( '/courses/', '/product-category/', '/product/' ), Link_Paths::android_paths( $entries ) );
		$many = array_map(
			static function ( $i ) {
				return array( 'prefix' => '/p' . $i . '/' );
			},
			range( 1, 30 )
		);
		$this->assertCount( Link_Paths::MAX_ANDROID, Link_Paths::android_paths( $many ) );
	}

	public function test_the_association_leaves_out_what_stays_on_the_website_first() {
		$components = Link_Paths::components( '/', array( '/courses/*', '/*' ), array( '/checkout/', '/my-account/' ) );
		$included   = array_values(
			array_filter(
				$components,
				static function ( $c ) {
					return empty( $c['exclude'] );
				}
			)
		);
		$this->assertSame( array( array( '/' => '/a/*' ), array( '/' => '/courses/*' ), array( '/' => '/*' ) ), $included );
		// iOS takes the first component that matches: every exclusion comes before the includes.
		$first_include = array_search( array( '/' => '/a/*' ), $components, true );
		foreach ( array_slice( $components, 0, $first_include ) as $component ) {
			$this->assertTrue( $component['exclude'] );
		}
		$paths = array_column( $components, '/' );
		foreach ( array( '/', '/wp-admin/*', '/wp-login.php*', '/wp-json/*', '*/feed/*', '/checkout/*', '/checkout', '/my-account/*' ) as $path ) {
			$this->assertContains( $path, $paths );
		}
		$queries = array_filter( array_column( $components, '?' ) );
		$this->assertContains( array( 'add-to-cart' => '*' ), $queries );
		$this->assertContains( array( 'rest_route' => '*' ), $queries );
		// Nothing to open but /a/*: the file stays as it was.
		$this->assertSame( array( array( '/' => '/a/*' ) ), Link_Paths::components( '/', array() ) );
		// A site in a folder: its own path before each.
		$folder = array_column( Link_Paths::components( '/learn/', array( '/learn/courses/*' ) ), '/' );
		$this->assertContains( '/learn/wp-admin/*', $folder );
		$this->assertContains( '/learn/a/*', $folder );
		$this->assertContains( '*/feed/*', $folder );
	}

	public function test_what_stays_on_the_website() {
		$pages = array( '/checkout/', '/cart/', '/my-account/' );
		foreach ( array( '/wp-admin/post.php', '/wp-login.php', '/wp-json/yallapp/v1/config', '/feed/', '/courses/feed/', '/checkout/', '/checkout/order-received/12/', '/my-account/orders/', '/cart', '/' ) as $path ) {
			$this->assertTrue( Link_Paths::is_excluded( $path, array(), '/', $pages ), $path );
		}
		$this->assertTrue( Link_Paths::is_excluded( '/product/shirt/', array( 'add-to-cart' => '12' ), '/', $pages ) );
		$this->assertTrue( Link_Paths::is_excluded( '/', array( 'rest_route' => '/yallapp/v1/config' ) ) );
		foreach ( array( '/courses/intro/', '/product/shirt/', '/2026/10/hello/', '/checkout-tips/' ) as $path ) {
			$this->assertFalse( Link_Paths::is_excluded( $path, array(), '/', $pages ), $path );
		}
		$this->assertTrue( Link_Paths::is_excluded( '/learn/wp-admin/', array(), '/learn/' ) );
		$this->assertTrue( Link_Paths::is_excluded( '/learn/', array(), '/learn/' ) );
	}

	public function test_the_first_folder_of_a_permalink_that_does_not_follow_its_base() {
		$this->assertSame( '/courses/', Link_Paths::sample_folder( '/courses/intro/lessons/one/' ) );
		$this->assertSame( '/learn/courses/', Link_Paths::sample_folder( '/learn/courses/intro/', '/learn/' ) );
		$this->assertNull( Link_Paths::sample_folder( '/intro/' ) );
		$this->assertNull( Link_Paths::sample_folder( '/other/intro/', '/learn/' ) );
	}

	public function test_patterns_match_as_ios_reads_them() {
		$this->assertTrue( Link_Paths::glob( '/courses/*', '/courses/intro/' ) );
		$this->assertTrue( Link_Paths::glob( '/????/??/*', '/2026/10/hello/' ) );
		$this->assertFalse( Link_Paths::glob( '/????/??/*', '/news/hello/' ) );
		$this->assertTrue( Link_Paths::glob( '*/feed/*', '/courses/feed/' ) );
		$this->assertFalse( Link_Paths::glob( '/courses/*', '/course/intro/' ) );
	}

	public function test_a_booking_form_for_one_service() {
		$codes = Link_Paths::BOOKING_SHORTCODES['amelia'];
		$this->assertSame( 3, Link_Paths::booking_service( 'Book here: [ameliabooking service=3]', $codes ) );
		$this->assertSame( 0, Link_Paths::booking_service( '[ameliabooking]', $codes ) );
		$this->assertSame( 7, Link_Paths::booking_service( '[latepoint_book_button service_id="7"]', Link_Paths::BOOKING_SHORTCODES['latepoint'] ) );
		$this->assertSame( 0, Link_Paths::booking_service( '[other service=3]', $codes ) );
	}

	public function test_the_resolver_answers_the_contract() {
		$this->assertTrue( Link_Resolver::same_site( array( 'scheme' => 'https', 'host' => 'Academy.example.com' ), 'academy.example.com' ) );
		$this->assertTrue( Link_Resolver::same_site( array( 'scheme' => 'https', 'host' => 'www.academy.example.com' ), 'academy.example.com' ) );
		$this->assertFalse( Link_Resolver::same_site( array( 'scheme' => 'https', 'host' => 'evil.example.com' ), 'academy.example.com' ) );
		$this->assertFalse( Link_Resolver::same_site( array( 'scheme' => 'javascript', 'host' => 'academy.example.com' ), 'academy.example.com' ) );
		$this->assertSame( array( 'kind' => 'course', 'id' => '12' ), Link_Resolver::answer( 'course', 12 ) );
		$this->assertSame( array( 'kind' => 'bookings', 'id' => null ), Link_Resolver::answer( 'bookings', null ) );
		$this->assertSame( array( 'kind' => null, 'id' => null ), Link_Resolver::answer( 'quiz', 3 ) );
		// The kinds are docs/api/app-links.json's resolved_kinds.
		$shared = json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/docs/api/app-links.json' ), true );
		$this->assertSame( array_column( $shared['resolved_kinds'], 'kind' ), Link_Resolver::KINDS );
	}

	public function test_the_association_with_the_sites_pages() {
		$file = App_Links::file_for( '/.well-known/apple-app-site-association', array( 'ios' => array( 'app_ids' => array( 'A1B2C3D4E5.com.ada.academy' ) ) ), '/', array( '/courses/*' ), array( '/checkout/' ) );
		$components = $file['applinks']['details'][0]['components'];
		$this->assertSame( array( '/' => '/courses/*' ), end( $components ) );
		$this->assertContains( array( '/' => '/checkout/*', 'exclude' => true ), $components );
		// A site in a folder serves the files under its own path too.
		$this->assertSame( App_Links::APPLE, App_Links::file_path( '/learn/.well-known/apple-app-site-association', '/learn/' ) );
		$this->assertSame( App_Links::ASSET_LINKS, App_Links::file_path( '/.well-known/assetlinks.json', '/learn/' ) );
		$this->assertNull( App_Links::file_path( '/learn/.well-known/security.txt', '/learn/' ) );
	}
}
