<?php
/**
 * 46 Links that open the app: the shared table, the links on the site and the link files.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\App_Links;

class AppLinksTest extends TestCase {

	const PLAY = '14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5';

	private static function shared() {
		return json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/docs/api/app-links.json' ), true );
	}

	public function test_the_table_is_docs_api_app_links_json() {
		$shared = self::shared();
		$kinds  = array();
		foreach ( $shared['kinds'] as $row ) {
			$kinds[ $row['kind'] ] = $row['id'];
		}
		$this->assertSame( $kinds, App_Links::KINDS );
		foreach ( $shared['id_patterns'] as $shape => $pattern ) {
			$this->assertSame( '/' . $pattern . '/', App_Links::ID_PATTERNS[ $shape ] );
		}
		$this->assertSame( '/a/', $shared['site_path'] );
	}

	public function test_the_site_links_of_the_examples() {
		// Every example on a site: a link of the table opens its kind (whether the app type has
		// that screen is the app's business); the others are left to WordPress.
		$expected = array(
			'https://academy.example.com/a/course/12'         => array( 'kind' => 'course', 'id' => '12' ),
			'https://academy.example.com/a/page/summer-offer' => array( 'kind' => 'page', 'id' => 'summer-offer' ),
			'https://news.example.com/a/article/431'          => array( 'kind' => 'article', 'id' => '431' ),
			'https://academy.example.com/a/product/3'         => array( 'kind' => 'product', 'id' => '3' ),
			'https://academy.example.com/a/course/0'          => null,
			'https://academy.example.com/a/course/12/extra'   => null,
			'https://academy.example.com/courses/intro/'      => null,
		);
		$seen     = 0;
		foreach ( self::shared()['examples'] as $example ) {
			if ( ! array_key_exists( $example['link'], $expected ) ) {
				continue;
			}
			++$seen;
			$this->assertSame( $expected[ $example['link'] ], App_Links::parse_path( (string) parse_url( $example['link'], PHP_URL_PATH ) ), $example['link'] );
		}
		$this->assertSame( count( $expected ), $seen );
	}

	public function test_links_after_the_site_path() {
		$this->assertSame( array( 'kind' => 'course', 'id' => '12' ), App_Links::parse_path( '/a/course/12/' ) );
		$this->assertSame( array( 'kind' => 'page', 'id' => 'offers' ), App_Links::parse_path( '/learn/a/page/offers', '/learn/' ) );
		$this->assertSame( array( 'kind' => 'article', 'id' => 'summer_news-1' ), App_Links::parse_path( '/a/article/summer_news-1' ) );
		$this->assertNull( App_Links::parse_path( '/a/course/12', '/learn/' ) );
		$this->assertNull( App_Links::parse_path( '/a/course/0' ) );
		$this->assertNull( App_Links::parse_path( '/a/lesson/12' ) );
		$this->assertNull( App_Links::parse_path( '/a/page/Home' ) );
		$this->assertNull( App_Links::parse_path( '/about/' ) );
	}

	public function test_the_files_say_what_the_license_status_says() {
		$links = array(
			'android' => array(
				'package_name'             => 'com.ada.academy',
				'sha256_cert_fingerprints' => array( self::PLAY ),
			),
			'ios'     => array( 'app_ids' => array( 'A1B2C3D4E5.com.ada.academy' ) ),
		);
		$this->assertSame(
			array(
				array(
					'relation' => array( 'delegate_permission/common.handle_all_urls' ),
					'target'   => array(
						'namespace'                => 'android_app',
						'package_name'             => 'com.ada.academy',
						'sha256_cert_fingerprints' => array( self::PLAY ),
					),
				),
			),
			App_Links::file_for( '/.well-known/assetlinks.json', $links )
		);
		$this->assertSame(
			array(
				'applinks' => array(
					'details' => array(
						array(
							'appIDs'     => array( 'A1B2C3D4E5.com.ada.academy' ),
							'components' => array( array( '/' => '/a/*' ) ),
						),
					),
				),
			),
			App_Links::file_for( '/.well-known/apple-app-site-association', $links )
		);
		$this->assertSame( '/learn/a/*', App_Links::file_for( '/.well-known/apple-app-site-association', $links, '/learn/' )['applinks']['details'][0]['components'][0]['/'] );
		$this->assertNull( App_Links::file_for( '/.well-known/assetlinks.json', null ) );
		$this->assertNull( App_Links::file_for( '/.well-known/assetlinks.json', array( 'android' => null, 'ios' => $links['ios'] ) ) );
		$this->assertNull( App_Links::file_for( '/.well-known/security.txt', $links ) );
	}

	public function test_only_well_formed_values_reach_the_files() {
		$this->assertNull( App_Links::sanitize( null ) );
		$this->assertNull( App_Links::sanitize( array( 'android' => array( 'package_name' => 'com.ada', 'sha256_cert_fingerprints' => array( 'aa:bb' ) ) ) ) );
		$clean = App_Links::sanitize(
			array(
				'android' => array(
					'package_name'             => 'com.ada.academy',
					'sha256_cert_fingerprints' => array( self::PLAY, '<script>', strtolower( self::PLAY ) ),
				),
				'ios'     => array( 'app_ids' => array( 'A1B2C3D4E5.com.ada.academy', 'bad id' ) ),
			)
		);
		$this->assertSame( array( self::PLAY ), $clean['android']['sha256_cert_fingerprints'] );
		$this->assertSame( array( 'A1B2C3D4E5.com.ada.academy' ), $clean['ios']['app_ids'] );
		$this->assertNull( App_Links::sanitize( array( 'android' => array( 'package_name' => 'Not A Package', 'sha256_cert_fingerprints' => array( self::PLAY ) ) ) ) );
	}
}
