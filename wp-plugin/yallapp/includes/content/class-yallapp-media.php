<?php
/**
 * Videos from the app's Yallapp Media library in the site's lessons (roadmap 51).
 *
 * @package Yallapp
 */

namespace Yallapp\Content;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use WP_Post;
use Yallapp\License\License_Client;

/**
 * The owner uploads videos to the Media library in the Yallapp dashboard; each has a Yallapp
 * link, `https://yallapp.com.tr/m/<id>`. A lesson uses one as its video when the link is
 * in the "Yallapp video" box (any LMS), the LMS's own video address (Tutor LMS's external
 * URL and the like), or a `[yallapp_video link="…"]` shortcode in the lesson. After the
 * LMS says the student may open the lesson, the plugin asks Yallapp, with its license, for
 * a link signed for that request (docs/api/platform.yaml, mediaLinks), and the app plays it
 * in its own player like an uploaded video. The file itself never passes through this site.
 */
class Yallapp_Media {

	const META      = '_yallapp_media_video';
	const SHORTCODE = 'yallapp_video';

	/**
	 * How long a playing link is kept for other students: it works 4 hours, and one handed
	 * out has at least 2 hours left (the app asks again before it ends).
	 */
	const CACHE_TTL = 3600;

	/**
	 * Asks the platform: `function ( array $ids, string $purpose )` returning the decoded
	 * MediaLinks body or a WP_Error.
	 *
	 * @var callable
	 */
	private $fetch;

	/**
	 * Constructor.
	 *
	 * @param License_Client|callable $client The license client, or a fetcher (tests).
	 */
	public function __construct( $client ) {
		$this->fetch = is_callable( $client ) ? $client : array( $client, 'media_links' );
	}

	/**
	 * Hooks into WordPress: the shortcode, for the website.
	 *
	 * @return void
	 */
	public function register() {
		add_shortcode( self::SHORTCODE, array( $this, 'shortcode' ) );
	}

	/**
	 * Yallapp's own address (`https://yallapp.com.tr`), where media links point.
	 *
	 * @return string
	 */
	public static function origin() {
		$parts = wp_parse_url( License_Client::base_url() );
		$port  = isset( $parts['port'] ) ? ':' . $parts['port'] : '';
		return strtolower( ( $parts['scheme'] ?? 'https' ) . '://' . ( $parts['host'] ?? 'yallapp.com.tr' ) ) . $port;
	}

	/**
	 * The media ID in a Yallapp link on `$origin`, or null. Pure.
	 *
	 * @param string $url    Address.
	 * @param string $origin Yallapp's address.
	 * @return string|null
	 */
	public static function id_of( $url, $origin ) {
		$url = trim( (string) $url );
		if ( '' === $url ) {
			return null;
		}
		$pattern = '#^' . preg_quote( rtrim( $origin, '/' ), '#' ) . '/m/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/?$#i';
		return preg_match( $pattern, $url, $m ) ? strtolower( $m[1] ) : null;
	}

	/**
	 * The first `[yallapp_video link="…"]` in content, as its link, or null. Pure.
	 *
	 * @param string $content Post content.
	 * @return string|null
	 */
	public static function shortcode_link( $content ) {
		if ( ! preg_match( '/\[' . self::SHORTCODE . '\s+[^\]]*?(?:link|url|id)\s*=\s*["\']?([^"\'\s\]]+)/i', (string) $content, $m ) ) {
			return null;
		}
		return $m[1];
	}

	/**
	 * The Yallapp link a lesson plays, in order: the "Yallapp video" box, the LMS's video
	 * address, the first shortcode in its content. Pure but for the meta read.
	 *
	 * @param array  $lesson The adapter's raw lesson (`post`, `video`).
	 * @param string $origin Yallapp's address.
	 * @return string|null The media ID.
	 */
	public static function lesson_media_id( array $lesson, $origin ) {
		$post       = $lesson['post'] ?? null;
		$candidates = array();
		if ( $post instanceof WP_Post ) {
			$candidates[] = (string) get_post_meta( $post->ID, self::META, true );
		}
		$video = $lesson['video'] ?? null;
		if ( is_array( $video ) ) {
			$candidates[] = (string) ( $video['url'] ?? '' );
			if ( ! empty( $video['embed_html'] ) && preg_match( '#(' . preg_quote( $origin, '#' ) . '/m/[0-9a-f-]{36})#i', (string) $video['embed_html'], $m ) ) {
				$candidates[] = $m[1];
			}
		}
		if ( $post instanceof WP_Post ) {
			$candidates[] = (string) self::shortcode_link( $post->post_content );
		}
		foreach ( $candidates as $candidate ) {
			$id = self::id_of( $candidate, $origin );
			if ( ! $id && preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $candidate ) ) {
				$id = strtolower( $candidate );
			}
			if ( $id ) {
				return $id;
			}
		}
		return null;
	}

	/**
	 * The raw video for a signed media link: an upload the app plays (and can save). Pure.
	 *
	 * @param array      $item  A MediaLinks item.
	 * @param array|null $video The LMS's video, for its length and poster.
	 * @return array
	 */
	public static function video_of( array $item, $video ) {
		return array(
			'source'           => 'upload',
			'url'              => (string) $item['url'],
			'attachment_id'    => 0,
			'expires_at'       => (string) $item['expires_at'],
			'size_bytes'       => isset( $item['size_bytes'] ) ? (int) $item['size_bytes'] : null,
			'mime_type'        => isset( $item['mime_type'] ) ? (string) $item['mime_type'] : null,
			'name'             => isset( $item['name'] ) ? (string) $item['name'] : null,
			'yallapp_media'    => (string) $item['id'],
			'embed_html'       => null,
			'duration_seconds' => is_array( $video ) ? ( $video['duration_seconds'] ?? null ) : null,
			'poster_url'       => is_array( $video ) ? ( $video['poster_url'] ?? null ) : null,
		);
	}

	/**
	 * A signed link for one file, or null when it's gone; a WP_Error when Yallapp can't be asked.
	 *
	 * @param string $id      Media ID.
	 * @param string $purpose play|download.
	 * @return array|null|WP_Error A MediaLinks item.
	 */
	public function signed( $id, $purpose ) {
		$transient = 'yallapp_media_' . md5( $purpose . ':' . $id );
		if ( 'play' === $purpose ) {
			$cached = get_transient( $transient );
			if ( is_array( $cached ) && isset( $cached['expires_at'] ) && strtotime( (string) $cached['expires_at'] ) > time() + 2 * HOUR_IN_SECONDS ) {
				return $cached;
			}
		}
		$result = call_user_func( $this->fetch, array( $id ), $purpose );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$item = null;
		foreach ( (array) ( $result['items'] ?? array() ) as $candidate ) {
			if ( is_array( $candidate ) && ( $candidate['id'] ?? '' ) === $id && preg_match( '#^https?://#i', (string) ( $candidate['url'] ?? '' ) ) ) {
				$item = $candidate;
			}
		}
		if ( $item && 'play' === $purpose ) {
			set_transient( $transient, $item, self::CACHE_TTL );
		}
		return $item;
	}

	/**
	 * The lesson with its Yallapp video signed, for a student the LMS lets open it. Playing:
	 * a video that's gone (or Yallapp unreachable) leaves the lesson without one. Saving:
	 * Yallapp unreachable is an error, so the app never saves a lesson without its video.
	 *
	 * @param array  $lesson  The adapter's raw lesson.
	 * @param string $purpose play|download.
	 * @return array|WP_Error
	 */
	public function apply( array $lesson, $purpose = 'play' ) {
		$id = self::lesson_media_id( $lesson, self::origin() );
		if ( ! $id ) {
			return $lesson;
		}
		$item = $this->signed( $id, $purpose );
		if ( is_wp_error( $item ) ) {
			if ( 'download' === $purpose ) {
				return new WP_Error( 'media_unavailable', __( 'The lesson\'s video can\'t be saved right now. Try again in a few minutes.', 'yallapp' ), array( 'status' => 503 ) );
			}
			$item = null;
		}
		$lesson['video'] = $item ? self::video_of( $item, $lesson['video'] ?? null ) : null;
		return $lesson;
	}

	/**
	 * `[yallapp_video link="https://yallapp.com.tr/m/<id>"]` on the website: the video in the
	 * browser's player, for whoever sees the content (the LMS decides who). In the app, the
	 * lesson's video plays in the app's own player instead, so the shortcode shows nothing there.
	 *
	 * @param array|string $atts Attributes.
	 * @return string
	 */
	public function shortcode( $atts ) {
		if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
			return '';
		}
		$atts = shortcode_atts(
			array(
				'link' => '',
				'url'  => '',
				'id'   => '',
			),
			(array) $atts,
			self::SHORTCODE
		);
		$link = $atts['link'] ? $atts['link'] : ( $atts['url'] ? $atts['url'] : $atts['id'] );
		$id   = self::id_of( (string) $link, self::origin() );
		if ( ! $id && preg_match( '/^[0-9a-f-]{36}$/i', (string) $link ) ) {
			$id = strtolower( (string) $link );
		}
		$item = $id ? $this->signed( $id, 'play' ) : null;
		if ( ! is_array( $item ) ) {
			return '';
		}
		if ( 'video' !== ( $item['kind'] ?? 'video' ) ) {
			return sprintf( '<a href="%1$s">%2$s</a>', esc_url( $item['url'] ), esc_html( (string) ( $item['name'] ?? '' ) ) );
		}
		return sprintf(
			'<video class="yallapp-video" src="%s" controls playsinline preload="metadata" controlslist="nodownload" style="width:100%%;max-width:100%%;height:auto"></video>',
			esc_url( $item['url'] )
		);
	}
}
