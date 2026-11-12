<?php
/**
 * 124.9 A page of the site opened in the app signed in: only the site's own pages.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Content\Magic_Links;

class WebLink124Test extends TestCase {

	const HOME = 'https://academy.test/';

	public function test_keeps_a_page_of_the_site() {
		$this->assertSame( 'https://academy.test/mock-exam/', Magic_Links::site_target( 'https://academy.test/mock-exam/', self::HOME ) );
		$this->assertSame( 'https://academy.test/mock-exam/?part=2#top', Magic_Links::site_target( ' https://academy.test/mock-exam/?part=2#top ', self::HOME ) );
		$this->assertSame( 'https://academy.test/', Magic_Links::site_target( 'https://ACADEMY.test', self::HOME ) );
	}

	public function test_www_either_way_lands_on_the_sites_own_host() {
		$this->assertSame( 'https://academy.test/mock-exam/', Magic_Links::site_target( 'https://www.academy.test/mock-exam/', self::HOME ) );
		$this->assertSame( 'https://www.academy.test/mock-exam/', Magic_Links::site_target( 'https://academy.test/mock-exam/', 'https://www.academy.test' ) );
	}

	public function test_https_or_the_sites_own_scheme() {
		$this->assertNull( Magic_Links::site_target( 'http://academy.test/mock-exam/', self::HOME ) );
		$this->assertSame( 'http://academy.test/a/', Magic_Links::site_target( 'http://academy.test/a/', 'http://academy.test' ) );
		$this->assertSame( 'https://academy.test/a/', Magic_Links::site_target( 'https://academy.test/a/', 'http://academy.test' ) );
		$this->assertNull( Magic_Links::site_target( 'javascript://academy.test/%0aalert(1)', self::HOME ) );
		$this->assertNull( Magic_Links::site_target( 'ftp://academy.test/a', self::HOME ) );
	}

	public function test_refuses_other_hosts() {
		foreach ( array(
			'https://meet.example.com/room',
			'https://academy.test.evil.com/',
			'https://evilacademy.test/',
			'https://sub.academy.test/',
			'https://academy.test@evil.com/',
			'https://user:pass@academy.test/',
			'https://academy.test:8443/',
			'//academy.test/a',
			'/mock-exam/',
			'https://academy.test\\@evil.com/',
			"https://academy.test/a\nLocation: https://evil.com",
			'https:/\\evil.com',
			'',
		) as $url ) {
			$this->assertNull( Magic_Links::site_target( $url, self::HOME ), $url );
		}
	}

	public function test_a_sites_port_is_its_own() {
		$this->assertSame( 'http://127.0.0.1:8089/a/', Magic_Links::site_target( 'http://127.0.0.1:8089/a/', 'http://127.0.0.1:8089' ) );
		$this->assertNull( Magic_Links::site_target( 'http://127.0.0.1/a/', 'http://127.0.0.1:8089' ) );
	}

	public function test_an_odd_path_stays_on_the_site() {
		// The address is rebuilt on the site's host: a doubled slash is a path, not another host.
		$this->assertSame( 'https://academy.test//evil.com/', Magic_Links::site_target( 'https://academy.test//evil.com/', self::HOME ) );
	}
}
