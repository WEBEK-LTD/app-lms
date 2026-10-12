<?php
/**
 * Signed, expiring links for uploaded videos.
 *
 * @package Yallapp
 */

namespace Yallapp\Content;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use WP_REST_Request;
use Yallapp\Crypto;
use Yallapp\Settings;

/**
 * Streams uploaded lesson videos through a signed URL tied to the student and an expiry
 * time, with HTTP range support so players can seek.
 */
class Media {

	const CHUNK = 1048576;

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Registers the streaming route.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			'yallapp/v1',
			'/media/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'stream' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'u'   => array( 'required' => true ),
					'e'   => array( 'required' => true ),
					'sig' => array( 'required' => true ),
				),
			)
		);
	}

	/**
	 * A signed URL for an attachment.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @param int $user_id       Student.
	 * @return array{url: string, expires_at: string}
	 */
	public function signed_url( $attachment_id, $user_id ) {
		$expires = time() + max( 60, (int) $this->settings->get( 'video_link_ttl' ) );
		$sig     = Crypto::sign( self::payload( $attachment_id, $user_id, $expires ) );
		$url     = add_query_arg(
			array(
				'u'   => (int) $user_id,
				'e'   => $expires,
				'sig' => $sig,
			),
			rest_url( 'yallapp/v1/media/' . (int) $attachment_id )
		);
		return array(
			'url'        => $url,
			'expires_at' => gmdate( 'c', $expires ),
		);
	}

	/**
	 * Streams the file when the signature is valid.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_Error|void
	 */
	public function stream( WP_REST_Request $request ) {
		$id      = (int) $request['id'];
		$user_id = (int) $request['u'];
		$expires = (int) $request['e'];
		if ( $expires < time() || ! Crypto::verify( self::payload( $id, $user_id, $expires ), (string) $request['sig'] ) ) {
			return new WP_Error( 'link_expired', __( 'This video link has expired.', 'yallapp' ), array( 'status' => 403 ) );
		}
		$file = get_attached_file( $id );
		if ( ! $file || ! is_readable( $file ) ) {
			return new WP_Error( 'not_found', __( 'Video not found.', 'yallapp' ), array( 'status' => 404 ) );
		}

		$size  = (int) filesize( $file );
		$start = 0;
		$end   = $size - 1;
		$range = isset( $_SERVER['HTTP_RANGE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_RANGE'] ) ) : '';
		if ( preg_match( '/^bytes=(\d*)-(\d*)$/', $range, $m ) ) {
			if ( '' === $m[1] && '' !== $m[2] ) {
				$start = max( 0, $size - (int) $m[2] );
			} else {
				$start = (int) $m[1];
				$end   = '' !== $m[2] ? min( (int) $m[2], $size - 1 ) : $end;
			}
			if ( $start > $end || $start >= $size ) {
				status_header( 416 );
				header( 'Content-Range: bytes */' . $size );
				exit;
			}
			status_header( 206 );
			header( sprintf( 'Content-Range: bytes %d-%d/%d', $start, $end, $size ) );
		} else {
			status_header( 200 );
		}

		$mime = get_post_mime_type( $id );
		header( 'Content-Type: ' . ( $mime ? $mime : 'application/octet-stream' ) );
		header( 'Accept-Ranges: bytes' );
		header( 'Content-Length: ' . ( $end - $start + 1 ) );
		header( 'Cache-Control: private, max-age=0, no-store' );
		header( 'Content-Disposition: inline' );

		// phpcs:disable WordPress.WP.AlternativeFunctions -- Streaming a large file in chunks.
		$handle = fopen( $file, 'rb' );
		fseek( $handle, $start );
		$remaining = $end - $start + 1;
		while ( $remaining > 0 && ! feof( $handle ) && ! connection_aborted() ) {
			$chunk = fread( $handle, min( self::CHUNK, $remaining ) );
			echo $chunk; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Binary file data.
			$remaining -= strlen( $chunk );
			flush();
		}
		fclose( $handle );
		// phpcs:enable
		exit;
	}

	/**
	 * Signed payload.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @param int $user_id       Student.
	 * @param int $expires       Expiry time.
	 * @return string
	 */
	private static function payload( $attachment_id, $user_id, $expires ) {
		return 'media|' . (int) $attachment_id . '|' . (int) $user_id . '|' . (int) $expires;
	}
}
