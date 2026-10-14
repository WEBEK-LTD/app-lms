<?php
/**
 * Lesson payloads for the app.
 *
 * @package Yallapp
 */

namespace Yallapp\Content;

defined( 'ABSPATH' ) || exit;

use WP_Post;
use Yallapp\Settings;

/**
 * Renders lesson content the way the website does, then shapes it for the app.
 */
class Lesson_Renderer {

	const OVERRIDE_META     = '_yallapp_render_mode';
	const EMBED_HEIGHT_META = '_yallapp_embed_height';

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Media.
	 *
	 * @var Media
	 */
	private $media;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings.
	 * @param Media    $media    Media.
	 */
	public function __construct( Settings $settings, Media $media ) {
		$this->settings = $settings;
		$this->media    = $media;
	}

	/**
	 * Lesson shape for the API.
	 *
	 * @param array $lesson  Raw lesson from the LMS adapter.
	 * @param int   $user_id Current user.
	 * @return array
	 */
	public function render( array $lesson, $user_id ) {
		$post      = $lesson['post'];
		$processed = Html_Processor::process( self::the_content( $post ), (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
		$mode      = $this->mode( $post, $processed['needs_webview'] );
		$position  = (int) get_user_meta( $user_id, 'yallapp_position_' . $post->ID, true );
		$height    = (string) get_post_meta( $post->ID, self::EMBED_HEIGHT_META, true );

		return array(
			'id'               => (int) $lesson['id'],
			'course_id'        => (int) $lesson['course_id'],
			'title'            => (string) $lesson['title'],
			'render_mode'      => $mode,
			'html'             => 'native' === $mode ? $processed['html'] : null,
			'webview_url'      => 'webview' === $mode ? $this->webview_url( $post, $user_id ) : null,
			'embeds'           => 'native' === $mode ? $processed['embeds'] : array(),
			'embed_height'     => in_array( $height, array( 'auto', 'fit_screen', 'as_set' ), true ) ? $height : null,
			'video'            => $this->video( $lesson['video'], $user_id ),
			'attachments'      => $lesson['attachments'],
			'completed'        => (bool) $lesson['completed'],
			'position_seconds' => $position,
			'previous_id'      => $lesson['previous_id'],
			'next_id'          => $lesson['next_id'],
		);
	}

	/**
	 * Video shape with a signed link for uploads.
	 *
	 * @param array|null $video   Raw video from the adapter.
	 * @param int        $user_id Current user.
	 * @return array|null
	 */
	public function video( $video, $user_id ) {
		if ( ! $video ) {
			return null;
		}
		$url     = $video['url'];
		$expires = null;
		if ( 'upload' === $video['source'] && $video['attachment_id'] ) {
			$signed  = $this->media->signed_url( (int) $video['attachment_id'], (int) $user_id );
			$url     = $signed['url'];
			$expires = $signed['expires_at'];
		}
		return array(
			'source'           => $video['source'],
			'url'              => $url,
			'expires_at'       => $expires,
			'embed_html'       => $video['embed_html'],
			'duration_seconds' => $video['duration_seconds'],
			'poster_url'       => $video['poster_url'],
		);
	}

	/**
	 * The content as the website renders it (lessons, and articles of News & blog apps).
	 *
	 * @param WP_Post $post Lesson or post.
	 * @return string
	 */
	public static function the_content( WP_Post $post ) {
		global $wp_query;
		$saved_post      = $GLOBALS['post'] ?? null;
		$saved_query     = $wp_query;
		$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Rendering filters expect the global post.
		setup_postdata( $post );
		$html = apply_filters( 'the_content', $post->post_content ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Core filter.
		wp_reset_postdata();
		$GLOBALS['post'] = $saved_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		$wp_query        = $saved_query; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		return (string) $html;
	}

	/**
	 * Native or web view: the post's own override, else the site setting, else what the content needs.
	 *
	 * @param WP_Post $post          Lesson or post.
	 * @param bool    $needs_webview Whether the content needs a browser.
	 * @return string
	 */
	public function mode( WP_Post $post, $needs_webview ) {
		$override = (string) get_post_meta( $post->ID, self::OVERRIDE_META, true );
		if ( in_array( $override, array( 'native', 'webview' ), true ) ) {
			return $override;
		}
		$setting = (string) $this->settings->get( 'render_mode' );
		if ( in_array( $setting, array( 'native', 'webview' ), true ) ) {
			return $setting;
		}
		if ( $needs_webview && ! $this->settings->get( 'allow_scripts' ) ) {
			return 'native';
		}
		return $needs_webview ? 'webview' : 'native';
	}

	/**
	 * A one-time link that opens the lesson on the website, signed in.
	 *
	 * @param WP_Post $post    Lesson.
	 * @param int     $user_id Current user.
	 * @return string|null
	 */
	private function webview_url( WP_Post $post, $user_id ) {
		$target = (string) get_permalink( $post );
		if ( ! $user_id ) {
			return $target;
		}
		return Magic_Links::create( $user_id, $target, true );
	}
}
