<?php
/**
 * 45 Offline lessons: which lessons can be saved, the owner's choice, the download links'
 * own signature, and when a finished course was finished.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Content\Downloads;
use Yallapp\Content\Media;
use Yallapp\Lms\Course_Completion;

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

if ( ! function_exists( 'get_option' ) ) {
	/**
	 * Minimal stand-in: a fixed signing secret.
	 *
	 * @param string $name Option.
	 * @return mixed
	 */
	function get_option( $name ) {
		return 'yallapp_secret' === $name ? 'dGVzdC1zZWNyZXQtZm9yLXVuaXQtdGVzdHMtb25seS0wMTIzNDU2Nzg5' : false;
	}
}

class DownloadsTest extends TestCase {

	private static function lesson( array $extra = array() ) {
		return array_merge(
			array(
				'id'          => 7,
				'course_id'   => 3,
				'render_mode' => 'native',
				'html'        => '<p>Text</p>',
				'embeds'      => array(),
			),
			$extra
		);
	}

	public function test_uploaded_videos_and_text_lessons_can_be_saved() {
		$this->assertNull( Downloads::blocker( self::lesson(), null ) );
		$this->assertNull(
			Downloads::blocker(
				self::lesson(),
				array(
					'source'        => 'upload',
					'url'           => 'https://academy.test/wp-content/uploads/a.mp4',
					'attachment_id' => 12,
				)
			)
		);
		// A direct file on another server too.
		$this->assertNull(
			Downloads::blocker(
				self::lesson(),
				array(
					'source' => 'external',
					'url'    => 'https://cdn.example.com/videos/lesson-1.MP4?token=1',
				)
			)
		);
	}

	public function test_video_sites_and_web_pages_need_the_internet() {
		foreach ( array( 'youtube', 'vimeo', 'embed' ) as $source ) {
			$this->assertSame(
				'video_site',
				Downloads::blocker(
					self::lesson(),
					array(
						'source' => $source,
						'url'    => 'https://www.youtube.com/watch?v=abc',
					)
				),
				$source
			);
		}
		// A player page on another server (Bunny Stream) isn't a file.
		$this->assertSame(
			'video_site',
			Downloads::blocker(
				self::lesson(),
				array(
					'source' => 'external',
					'url'    => 'https://iframe.mediadelivery.net/embed/1/abc',
				)
			)
		);
		$this->assertSame( 'web_page', Downloads::blocker( self::lesson( array( 'render_mode' => 'webview' ) ), null ) );
		$this->assertSame( 'video_site', Downloads::blocker( self::lesson( array( 'embeds' => array( array( 'provider' => 'vimeo' ) ) ) ), null ) );
		$this->assertSame( 'web_page', Downloads::blocker( self::lesson( array( 'embeds' => array( array( 'provider' => 'other' ) ) ) ), null ) );
	}

	public function test_the_dashboard_choice_wins_over_the_plugin_setting() {
		$this->assertTrue( Downloads::choice( null, true ) );
		$this->assertFalse( Downloads::choice( null, false ) );
		$this->assertFalse( Downloads::choice( false, true ) );
		$this->assertTrue( Downloads::choice( true, false ) );
	}

	public function test_no_license_or_plan_is_needed() {
		$settings = $this->getMockBuilder( \Yallapp\Settings::class )->disableOriginalConstructor()->onlyMethods( array( 'get' ) )->getMock();
		$settings->method( 'get' )->willReturnCallback(
			static function ( $key ) {
				return 'offline_downloads' === $key;
			}
		);
		$media = $this->getMockBuilder( Media::class )->disableOriginalConstructor()->getMock();
		// An ended plan without offline mode: the plugin's setting still decides.
		$license = $this->getMockBuilder( \Yallapp\License\License_Client::class )->disableOriginalConstructor()->onlyMethods( array( 'has_key', 'status', 'state', 'is_active' ) )->getMock();
		$license->method( 'has_key' )->willReturn( true );
		$license->method( 'status' )->willReturn(
			array(
				'status'            => 'expired',
				'features'          => array(),
				'offline_downloads' => null,
			)
		);
		$license->method( 'state' )->willReturn( 'expired' );
		$license->method( 'is_active' )->willReturn( false );
		$this->assertTrue( ( new Downloads( $settings, $license, $media ) )->enabled() );
		// No license at all.
		$this->assertTrue( ( new Downloads( $settings, null, $media ) )->enabled() );
	}

	public function test_images_in_the_lesson_text_once_each() {
		$html = '<p><img src="https://academy.test/a.png" alt=""> <img class="x" src=\'https://academy.test/b.jpg?x=1&amp;y=2\'>'
			. '<img src="https://academy.test/a.png"><img src="data:image/png;base64,AAAA"><img src="/relative.png"></p>';
		$this->assertSame(
			array( 'https://academy.test/a.png', 'https://academy.test/b.jpg?x=1&y=2' ),
			Downloads::image_sources( $html )
		);
		$this->assertSame( array(), Downloads::image_sources( '<p>No images</p>' ) );
	}

	public function test_download_links_have_their_own_signature() {
		$now     = 1700000000;
		$expires = $now + Media::DOWNLOAD_TTL;
		$payload = 'download|12|5|' . $expires;
		$sig     = Yallapp\Crypto::sign( $payload );
		$this->assertTrue( Media::valid( 12, 5, $expires, $sig, true, $now ) );
		// A download signature doesn't stream, and a streaming one doesn't download.
		$this->assertFalse( Media::valid( 12, 5, $expires, $sig, false, $now ) );
		$this->assertFalse( Media::valid( 12, 5, $expires, Yallapp\Crypto::sign( 'media|12|5|' . $expires ), true, $now ) );
		// Another student, another file, a changed time, or too late.
		$this->assertFalse( Media::valid( 12, 6, $expires, $sig, true, $now ) );
		$this->assertFalse( Media::valid( 13, 5, $expires, $sig, true, $now ) );
		$this->assertFalse( Media::valid( 12, 5, $expires + 60, $sig, true, $now ) );
		$this->assertFalse( Media::valid( 12, 5, $expires, $sig, true, $expires + 1 ) );
		$this->assertSame( 900, Media::DOWNLOAD_TTL );
	}

	public function test_completion_date_in_order_of_trust() {
		$this->assertNull( Course_Completion::pick( false, '2026-01-02T03:04:05Z', null, null ) );
		$this->assertSame( '2026-01-02T03:04:05Z', Course_Completion::pick( true, '2026-01-02T03:04:05Z', '2026-02-01T00:00:00Z', null ) );
		$this->assertSame( '2026-02-01T00:00:00Z', Course_Completion::pick( true, null, '2026-02-01T00:00:00+00:00', '2026-03-01T00:00:00Z' ) );
		$this->assertSame( '2026-03-01T00:00:00Z', Course_Completion::pick( true, '', '', '2026-03-01T00:00:00Z' ) );
		$this->assertNull( Course_Completion::pick( true, null, '', 'not a date' ) );
	}
}
