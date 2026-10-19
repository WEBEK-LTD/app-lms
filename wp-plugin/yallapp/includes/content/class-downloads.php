<?php
/**
 * Lessons saved for offline viewing.
 *
 * @package Yallapp
 */

namespace Yallapp\Content;

defined( 'ABSPATH' ) || exit;

use Yallapp\License\License_Client;
use Yallapp\Settings;

/**
 * 45 Which lessons the app may save on the phone, and the signed links to their files: the
 * uploaded video, the attachments and the images in the lesson text. The app keeps them
 * encrypted in its own storage and asks `POST /me/downloads/check` whether the student may
 * keep them. Lessons whose video plays from a video site can't be saved.
 */
class Downloads {

	/**
	 * Days the app may keep a lesson without checking the student's access.
	 */
	const KEEP_DAYS = 30;

	/**
	 * Lessons one access check may ask about.
	 */
	const MAX_CHECK = 500;

	/**
	 * A direct video file on another server (`video.source` external) can be saved.
	 */
	const FILE_EXTENSIONS = array( 'mp4', 'm4v', 'mov', 'webm', 'mp3', 'm4a' );

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * License (the plan and the owner's choice on the dashboard).
	 *
	 * @var License_Client|null
	 */
	private $license;

	/**
	 * Media.
	 *
	 * @var Media
	 */
	private $media;

	/**
	 * Constructor.
	 *
	 * @param Settings            $settings Settings.
	 * @param License_Client|null $license  License.
	 * @param Media               $media    Media.
	 */
	public function __construct( Settings $settings, $license, Media $media ) {
		$this->settings = $settings;
		$this->license  = $license;
		$this->media    = $media;
	}

	/**
	 * Whether downloads are on: the plan includes offline mode and the owner turned them on.
	 *
	 * @return bool
	 */
	public function enabled() {
		if ( $this->license && ! $this->license->has_feature( 'offline_downloads' ) ) {
			return false;
		}
		$choice = $this->license && $this->license->has_key() ? ( $this->license->status()['offline_downloads'] ?? null ) : null;
		return self::choice( $choice, (bool) $this->settings->get( 'offline_downloads' ) );
	}

	/**
	 * The owner's choice on the dashboard wins; without one, the plugin setting. Pure.
	 *
	 * @param bool|null $platform The dashboard's choice (`LicenseStatus.offline_downloads`).
	 * @param bool      $setting  The plugin's "Allow offline downloads".
	 * @return bool
	 */
	public static function choice( $platform, $setting ) {
		return is_bool( $platform ) ? $platform : (bool) $setting;
	}

	/**
	 * Why a lesson can't be saved, or null when it can (`LessonOffline.reason`). Pure.
	 *
	 * @param array      $lesson Lesson shape as the app gets it.
	 * @param array|null $video  The adapter's raw video (with `attachment_id`).
	 * @return string|null video_site|web_page
	 */
	public static function blocker( array $lesson, $video ) {
		if ( 'webview' === ( $lesson['render_mode'] ?? '' ) ) {
			return 'web_page';
		}
		if ( is_array( $video ) && ! self::video_file( $video ) ) {
			return 'video_site';
		}
		$embeds = (array) ( $lesson['embeds'] ?? array() );
		if ( $embeds ) {
			foreach ( $embeds as $embed ) {
				if ( in_array( $embed['provider'] ?? '', array( 'youtube', 'vimeo' ), true ) ) {
					return 'video_site';
				}
			}
			return 'web_page';
		}
		return null;
	}

	/**
	 * Whether a raw video is a file the app can save: an upload, or a direct file address. Pure.
	 *
	 * @param array $video Raw video.
	 * @return bool
	 */
	public static function video_file( array $video ) {
		if ( 'upload' === ( $video['source'] ?? '' ) ) {
			return ! empty( $video['attachment_id'] ) || ! empty( $video['url'] );
		}
		if ( 'external' !== ( $video['source'] ?? '' ) || empty( $video['url'] ) ) {
			return false;
		}
		$path = (string) wp_parse_url( (string) $video['url'], PHP_URL_PATH );
		return in_array( strtolower( pathinfo( $path, PATHINFO_EXTENSION ) ), self::FILE_EXTENSIONS, true );
	}

	/**
	 * `Lesson.offline` for a rendered lesson.
	 *
	 * @param array $lesson Lesson shape.
	 * @param array $raw    The adapter's raw lesson.
	 * @return array LessonOffline shape.
	 */
	public function offline( array $lesson, array $raw ) {
		if ( ! $this->enabled() ) {
			return array(
				'available'  => false,
				'reason'     => 'disabled',
				'size_bytes' => null,
			);
		}
		$reason = self::blocker( $lesson, $raw['video'] ?? null );
		if ( null !== $reason ) {
			return array(
				'available'  => false,
				'reason'     => $reason,
				'size_bytes' => null,
			);
		}
		$sizes = array_filter(
			array_map(
				function ( $file ) {
					return $file['size_bytes'];
				},
				$this->files( $lesson, $raw, 0, false )
			),
			'is_int'
		);
		return array(
			'available'  => true,
			'reason'     => null,
			'size_bytes' => $sizes ? array_sum( $sizes ) : null,
		);
	}

	/**
	 * `LessonDownload` for a lesson the student may open.
	 *
	 * @param array $lesson  Lesson shape.
	 * @param array $raw     The adapter's raw lesson.
	 * @param int   $user_id Student.
	 * @return array
	 */
	public function package( array $lesson, array $raw, $user_id ) {
		return array(
			'lesson_id'  => (int) $lesson['id'],
			'course_id'  => (int) $lesson['course_id'],
			'files'      => $this->files( $lesson, $raw, (int) $user_id, true ),
			'expires_at' => gmdate( 'c', time() + Media::DOWNLOAD_TTL ),
			'keep_days'  => self::KEEP_DAYS,
		);
	}

	/**
	 * The lesson's files: the video, the attachments and the images in its text.
	 *
	 * @param array $lesson  Lesson shape.
	 * @param array $raw     The adapter's raw lesson.
	 * @param int   $user_id Student.
	 * @param bool  $sign    Whether to make the signed links (else only names and sizes).
	 * @return array[] DownloadFile shapes.
	 */
	private function files( array $lesson, array $raw, $user_id, $sign ) {
		$files = array();
		$video = $raw['video'] ?? null;
		if ( is_array( $video ) && self::video_file( $video ) ) {
			$files[] = $this->file( 'video', (string) $video['url'], (int) ( $video['attachment_id'] ?? 0 ), null, null, $user_id, $sign );
		}
		foreach ( (array) ( $raw['attachments'] ?? array() ) as $attachment ) {
			if ( empty( $attachment['url'] ) ) {
				continue;
			}
			$id      = (int) attachment_url_to_postid( (string) $attachment['url'] );
			$files[] = $this->file( 'attachment', (string) $attachment['url'], $id, $attachment['name'] ?? null, $attachment['size_bytes'] ?? null, $user_id, $sign, $attachment['mime_type'] ?? null );
		}
		foreach ( self::image_sources( (string) ( $lesson['html'] ?? '' ) ) as $src ) {
			$files[] = $this->file( 'image', $src, 0, null, self::local_size( $src ), $user_id, false );
		}
		return $files;
	}

	/**
	 * One DownloadFile shape.
	 *
	 * @param string      $kind    video|attachment|image.
	 * @param string      $url     The address the lesson uses.
	 * @param int         $id      Attachment ID, 0 when the file isn't in the media library.
	 * @param string|null $name    Name.
	 * @param int|null    $size    Size in bytes when known.
	 * @param int         $user_id Student.
	 * @param bool        $sign    Sign a link for a media library file.
	 * @param string|null $mime    MIME type.
	 * @return array
	 */
	private function file( $kind, $url, $id, $name, $size, $user_id, $sign, $mime = null ) {
		$path = $id ? get_attached_file( $id ) : '';
		if ( $id && $path && is_readable( $path ) ) {
			$size = (int) filesize( $path );
			$mime = $mime ? $mime : get_post_mime_type( $id );
			$name = $name ? $name : wp_basename( $path );
		}
		return array(
			'kind'       => $kind,
			'url'        => $sign && $id && $path ? $this->media->download_url( $id, $user_id )['url'] : $url,
			'source_url' => 'video' === $kind ? null : $url,
			'name'       => null !== $name ? (string) $name : null,
			'size_bytes' => is_numeric( $size ) ? (int) $size : null,
			'mime_type'  => $mime ? (string) $mime : null,
		);
	}

	/**
	 * The images in lesson HTML, once each. Pure.
	 *
	 * @param string $html Lesson HTML.
	 * @return string[]
	 */
	public static function image_sources( $html ) {
		if ( ! preg_match_all( '/<img\b[^>]*?\ssrc\s*=\s*(["\'])(.*?)\1/i', $html, $matches ) ) {
			return array();
		}
		$sources = array();
		foreach ( $matches[2] as $src ) {
			$src = html_entity_decode( trim( $src ), ENT_QUOTES, 'UTF-8' );
			if ( preg_match( '#^https?://#i', $src ) && ! in_array( $src, $sources, true ) ) {
				$sources[] = $src;
			}
		}
		return $sources;
	}

	/**
	 * The size of an image in this site's uploads, when it is one.
	 *
	 * @param string $src Image address.
	 * @return int|null
	 */
	private static function local_size( $src ) {
		$uploads = wp_get_upload_dir();
		$base    = (string) $uploads['baseurl'];
		if ( '' === $base || 0 !== strpos( $src, $base . '/' ) ) {
			return null;
		}
		$path = realpath( $uploads['basedir'] . '/' . rawurldecode( (string) wp_parse_url( substr( $src, strlen( $base ) + 1 ), PHP_URL_PATH ) ) );
		return $path && 0 === strpos( $path, (string) realpath( $uploads['basedir'] ) ) && is_file( $path ) ? (int) filesize( $path ) : null;
	}
}
