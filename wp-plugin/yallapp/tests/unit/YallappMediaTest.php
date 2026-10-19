<?php
/**
 * 51 Videos from the app's Yallapp Media library in the site's lessons: which link a lesson
 * plays, asking Yallapp for a signed link only then (and once per request), and what the
 * app gets.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Content\Yallapp_Media;

if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
	define( 'HOUR_IN_SECONDS', 3600 );
}

if ( ! class_exists( 'WP_Error' ) ) {
	/**
	 * Minimal stand-in for WordPress's error.
	 */
	class WP_Error { // phpcs:ignore Generic.Files.OneObjectStructurePerFile.MultipleFound
		/**
		 * Code.
		 *
		 * @var string
		 */
		public $code;

		/**
		 * Constructor.
		 *
		 * @param string $code Code.
		 */
		public function __construct( $code = '' ) {
			$this->code = $code;
		}
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	/**
	 * Minimal stand-in.
	 *
	 * @param mixed $thing Value.
	 * @return bool
	 */
	function is_wp_error( $thing ) {
		return $thing instanceof WP_Error;
	}
}

if ( ! function_exists( 'untrailingslashit' ) ) {
	/**
	 * Minimal stand-in.
	 *
	 * @param string $value Value.
	 * @return string
	 */
	function untrailingslashit( $value ) {
		return rtrim( (string) $value, '/\\' );
	}
}

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

if ( ! function_exists( 'get_transient' ) ) {
	/**
	 * Stand-in transients, kept for the test run.
	 *
	 * @param string $key Key.
	 * @return mixed
	 */
	function get_transient( $key ) {
		return $GLOBALS['yallapp_test_transients'][ $key ] ?? false;
	}

	/**
	 * Stand-in.
	 *
	 * @param string $key   Key.
	 * @param mixed  $value Value.
	 * @param int    $ttl   Seconds.
	 * @return bool
	 */
	function set_transient( $key, $value, $ttl ) {
		unset( $ttl );
		$GLOBALS['yallapp_test_transients'][ $key ] = $value;
		return true;
	}
}

class YallappMediaTest extends TestCase {

	const ID = '3f1c2a9e-8d4b-4c6a-9e2f-1b7d5a0c4e88';

	protected function setUp(): void {
		$GLOBALS['yallapp_test_transients'] = array();
	}

	public function test_reads_yallapp_links_only() {
		$origin = 'https://yallapp.com.tr';
		$this->assertSame( 'https://yallapp.com.tr', Yallapp_Media::origin() );
		$this->assertSame( self::ID, Yallapp_Media::id_of( 'https://yallapp.com.tr/m/' . self::ID, $origin ) );
		$this->assertSame( self::ID, Yallapp_Media::id_of( ' https://yallapp.com.tr/m/' . strtoupper( self::ID ) . '/ ', $origin ) );
		$this->assertNull( Yallapp_Media::id_of( 'https://evil.test/m/' . self::ID, $origin ) );
		$this->assertNull( Yallapp_Media::id_of( 'https://yallapp.com.tr.evil.test/m/' . self::ID, $origin ) );
		$this->assertNull( Yallapp_Media::id_of( 'https://yallapp.com.tr/m/' . self::ID . '/x', $origin ) );
		$this->assertNull( Yallapp_Media::id_of( 'https://www.youtube.com/watch?v=abc', $origin ) );
		$this->assertNull( Yallapp_Media::id_of( '', $origin ) );
	}

	public function test_finds_the_shortcode() {
		$this->assertSame( 'https://yallapp.com.tr/m/' . self::ID, Yallapp_Media::shortcode_link( '<p>Watch:</p>[yallapp_video link="https://yallapp.com.tr/m/' . self::ID . '"]' ) );
		$this->assertSame( self::ID, Yallapp_Media::shortcode_link( "[yallapp_video id='" . self::ID . "']" ) );
		$this->assertNull( Yallapp_Media::shortcode_link( '[video src="https://example.test/a.mp4"]' ) );
	}

	public function test_the_lessons_video_comes_from_its_video_address_or_embed() {
		$origin = 'https://yallapp.com.tr';
		$this->assertSame( self::ID, Yallapp_Media::lesson_media_id( array( 'video' => array( 'url' => $origin . '/m/' . self::ID ) ), $origin ) );
		$this->assertSame(
			self::ID,
			Yallapp_Media::lesson_media_id( array( 'video' => array( 'url' => null, 'embed_html' => '<iframe src="' . $origin . '/m/' . self::ID . '"></iframe>' ) ), $origin )
		);
		$this->assertNull( Yallapp_Media::lesson_media_id( array( 'video' => array( 'url' => 'https://vimeo.com/1' ) ), $origin ) );
		$this->assertNull( Yallapp_Media::lesson_media_id( array( 'video' => null ), $origin ) );
	}

	private static function item( array $extra = array() ) {
		return array_merge(
			array(
				'id'         => self::ID,
				'kind'       => 'video',
				'url'        => 'https://yallapp.com.tr/media/v/a/' . self::ID . '.mp4?expires=1&sig=x',
				'expires_at' => gmdate( 'c', time() + 4 * 3600 ),
				'size_bytes' => 52428800,
				'mime_type'  => 'video/mp4',
				'name'       => 'Week 1.mp4',
			),
			$extra
		);
	}

	public function test_signs_the_video_for_the_student_and_keeps_its_length_and_poster() {
		$calls = array();
		$media = new Yallapp_Media(
			function ( array $ids, $purpose ) use ( &$calls ) {
				$calls[] = array( $ids, $purpose );
				return array(
					'items'   => array( self::item() ),
					'missing' => array(),
				);
			}
		);
		$lesson = array(
			'id'    => 7,
			'video' => array(
				'source'           => 'external',
				'url'              => 'https://yallapp.com.tr/m/' . self::ID,
				'duration_seconds' => 600,
				'poster_url'       => 'https://academy.test/poster.jpg',
			),
		);
		$played = $media->apply( $lesson, 'play' );
		$this->assertSame( 'upload', $played['video']['source'] );
		$this->assertSame( self::item()['url'], $played['video']['url'] );
		$this->assertSame( self::item()['expires_at'], $played['video']['expires_at'] );
		$this->assertSame( 600, $played['video']['duration_seconds'] );
		$this->assertSame( 'https://academy.test/poster.jpg', $played['video']['poster_url'] );
		$this->assertSame( 52428800, $played['video']['size_bytes'] );
		$this->assertSame( 0, $played['video']['attachment_id'] );
		// The app can save it: an upload with a URL.
		$this->assertTrue( Yallapp\Content\Downloads::video_file( $played['video'] ) );
		// Asked once; the next student gets the cached link while it has hours left.
		$media->apply( $lesson, 'play' );
		( new Yallapp_Media(
			function () {
				throw new RuntimeException( 'Not asked again' );
			}
		) )->apply( $lesson, 'play' );
		$this->assertSame( array( array( array( self::ID ), 'play' ) ), $calls );
		// Saving asks for its own short link, never cached.
		$media->apply( $lesson, 'download' );
		$this->assertSame( 'download', $calls[1][1] );
	}

	public function test_a_lesson_without_a_yallapp_video_is_left_alone() {
		$media  = new Yallapp_Media(
			function () {
				throw new RuntimeException( 'Not asked' );
			}
		);
		$lesson = array( 'video' => array( 'source' => 'youtube', 'url' => 'https://www.youtube.com/watch?v=abc' ) );
		$this->assertSame( $lesson, $media->apply( $lesson, 'play' ) );
	}

	public function test_a_deleted_video_or_an_unreachable_yallapp() {
		$lesson  = array( 'video' => array( 'source' => 'external', 'url' => 'https://yallapp.com.tr/m/' . self::ID ) );
		$missing = new Yallapp_Media(
			function () {
				return array(
					'items'   => array(),
					'missing' => array( self::ID ),
				);
			}
		);
		$this->assertNull( $missing->apply( $lesson, 'play' )['video'] );
		$down = new Yallapp_Media(
			function () {
				return new WP_Error( 'platform_unreachable' );
			}
		);
		// Playing: the lesson opens without its video. Saving: an error, never a lesson without it.
		$this->assertNull( $down->apply( $lesson, 'play' )['video'] );
		$this->assertTrue( is_wp_error( $down->apply( $lesson, 'download' ) ) );
	}
}
