<?php
/**
 * 51 Checks of videos from the app's Yallapp Media library inside the dev site (Tutor LMS),
 * with the platform replaced by a pre_http_request filter: a lesson whose "Yallapp video" box
 * or video address holds a Yallapp link plays it from a link Yallapp signed for the request,
 * asked only after Tutor LMS let the student in; a deleted file leaves the lesson without a
 * video; the [yallapp_video] shortcode on the website. Leaves the site as it found it.
 *
 * Usage: wp eval-file tests/integration/media-check.php
 * Prints {"checks": [[name, ok, detail], ...]} for the calling test to report.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test script run by WP-CLI, not loaded by the plugin.

use Yallapp\Content\Yallapp_Media;
use Yallapp\Plugin;

$checks   = array();
$requests = array();
$missing  = false;
$check    = static function ( $name, $ok, $detail = '' ) use ( &$checks ) {
	$checks[] = array( $name, (bool) $ok, is_string( $detail ) ? $detail : wp_json_encode( $detail ) );
};
$id    = '3f1c2a9e-8d4b-4c6a-9e2f-1b7d5a0c4e88';
$link  = Yallapp_Media::origin() . '/m/' . $id;
$until = gmdate( 'c', time() + 4 * 3600 );
add_filter(
	'pre_http_request',
	static function ( $pre, $request, $url ) use ( &$requests, &$missing, $id, $until ) {
		if ( false === strpos( $url, '/licenses/media' ) ) {
			return $pre;
		}
		$body       = json_decode( (string) $request['body'], true );
		$requests[] = array(
			'url'    => $url,
			'method' => $request['method'],
			'body'   => $body,
		);
		$answer = $missing
			? array(
				'items'   => array(),
				'missing' => array( $id ),
			)
			: array(
				'items'   => array(
					array(
						'id'         => $id,
						'kind'       => 'video',
						'url'        => 'https://yallapp.com.tr/media/v/app/' . $id . '.mp4?expires=1&sig=' . ( 'download' === ( $body['purpose'] ?? '' ) ? 'dl' : 'play' ),
						'expires_at' => $until,
						'size_bytes' => 52428800,
						'mime_type'  => 'video/mp4',
						'name'       => 'Week 1.mp4',
					),
				),
				'missing' => array(),
			);
		return array(
			'headers'  => array(),
			'body'     => wp_json_encode( $answer ),
			'response' => array(
				'code'    => 200,
				'message' => '',
			),
			'cookies'  => array(),
			'filename' => null,
		);
	},
	10,
	3
);

$plugin   = Plugin::instance();
$settings = $plugin->settings();
$settings->update( array( 'license_key' => 'YALL-TEST-0000-0051' ) );
update_option( 'yallapp_license', array( 'status' => 'active', 'plan' => 'growth', 'features' => array( 'offline_downloads' ), 'contacted_at' => time() ), false );

$seed    = json_decode( (string) get_option( 'yallapp_seed_ids' ), true );
$seed    = is_array( $seed ) ? $seed : (array) get_option( 'yallapp_seed_ids' );
$preview = (int) ( $seed['lesson_video'] ?? 0 );
$locked  = (int) ( $seed['design_locked'] ?? 0 );
$get     = static function ( $lesson_id ) {
	$response = rest_do_request( new WP_REST_Request( 'GET', '/yallapp/v1/lessons/' . $lesson_id ) );
	return array( $response->get_status(), $response->get_data() );
};

// The "Yallapp video" box of the free preview lesson.
update_post_meta( $preview, Yallapp_Media::META, $link );
delete_transient( 'yallapp_media_' . md5( 'play:' . $id ) );
list( $status, $lesson ) = $get( $preview );
$last                    = end( $requests );
$check(
	'media: the lesson plays its Yallapp video from a link signed for the request',
	200 === $status && 'upload' === ( $lesson['video']['source'] ?? '' ) && false !== strpos( (string) ( $lesson['video']['url'] ?? '' ), 'sig=play' ) && $until === ( $lesson['video']['expires_at'] ?? '' ),
	$lesson['video'] ?? $lesson
);
$check(
	'media: the plugin asks POST /licenses/media with its license and the ID',
	$last && 'POST' === $last['method'] && '/api/v1/licenses/media' === substr( $last['url'], -22 ) && 'YALL-TEST-0000-0051' === ( $last['body']['license_key'] ?? '' ) && array( $id ) === ( $last['body']['media'] ?? null ) && 'play' === ( $last['body']['purpose'] ?? '' ),
	$last
);
$check( 'media: its size is known for offline viewing', 52428800 === ( $lesson['offline']['size_bytes'] ?? null ) || 'disabled' === ( $lesson['offline']['reason'] ?? '' ), $lesson['offline'] ?? null );
$count = count( $requests );
$get( $preview );
$check( 'media: the next student gets the same link without asking again', count( $requests ) === $count, count( $requests ) );

// A lesson the visitor may not open: refused before Yallapp is asked.
if ( $locked ) {
	update_post_meta( $locked, Yallapp_Media::META, $link );
	delete_transient( 'yallapp_media_' . md5( 'play:' . $id ) );
	wp_set_current_user( 0 );
	$count                  = count( $requests );
	list( $status, $closed ) = $get( $locked );
	$check( 'media: a locked lesson is refused and Yallapp isn\'t asked', in_array( $status, array( 401, 403 ), true ) && count( $requests ) === $count, array( $status, $closed ) );
	delete_post_meta( $locked, Yallapp_Media::META );
}

// The file was deleted in Media: the lesson opens without a video.
$missing = true;
delete_transient( 'yallapp_media_' . md5( 'play:' . $id ) );
list( $status, $lesson ) = $get( $preview );
$check( 'media: a deleted file leaves the lesson without a video', 200 === $status && empty( $lesson['video'] ), $lesson['video'] ?? null );
$missing = false;

// The website: the shortcode in the browser's player; nothing in the app's HTML.
delete_transient( 'yallapp_media_' . md5( 'play:' . $id ) );
$html = do_shortcode( '[yallapp_video link="' . $link . '"]' );
$check( 'media: [yallapp_video] shows the video on the website', 0 === strpos( $html, '<video class="yallapp-video" src="https://yallapp.com.tr/media/v/' ) && false !== strpos( $html, 'controlslist="nodownload"' ), $html );
$check( 'media: [yallapp_video] with another site\'s link shows nothing', '' === do_shortcode( '[yallapp_video link="https://example.test/m/' . $id . '"]' ) );

delete_post_meta( $preview, Yallapp_Media::META );
delete_transient( 'yallapp_media_' . md5( 'play:' . $id ) );
$settings->update( array( 'license_key' => '' ) );
delete_option( 'yallapp_license' );

echo wp_json_encode( array( 'checks' => $checks ) );
