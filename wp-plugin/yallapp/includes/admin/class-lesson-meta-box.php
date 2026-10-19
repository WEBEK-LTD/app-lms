<?php
/**
 * Per-lesson display overrides.
 *
 * @package Yallapp
 */

namespace Yallapp\Admin;

defined( 'ABSPATH' ) || exit;

use WP_Post;
use Yallapp\Content\Lesson_Renderer;
use Yallapp\Content\Yallapp_Media;

/**
 * Adds an "In the app" box to the lesson edit screen.
 */
class Lesson_Meta_Box {

	const NONCE = 'yallapp_lesson_meta';

	/**
	 * Hooks into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'add_meta_boxes', array( $this, 'add' ) );
		add_action( 'save_post', array( $this, 'save' ), 10, 2 );
	}

	/**
	 * Post types that get the box.
	 *
	 * @return string[]
	 */
	private static function post_types() {
		$lms = \Yallapp\Plugin::instance()->lms();
		return $lms ? array( $lms->post_types()['lesson'] ) : array();
	}

	/**
	 * Adds the box.
	 *
	 * @param string $post_type Post type.
	 * @return void
	 */
	public function add( $post_type ) {
		if ( in_array( $post_type, self::post_types(), true ) ) {
			add_meta_box( 'yallapp-lesson', __( 'In the app', 'yallapp' ), array( $this, 'render' ), $post_type, 'side' );
		}
	}

	/**
	 * Renders the box.
	 *
	 * @param WP_Post $post Lesson.
	 * @return void
	 */
	public function render( WP_Post $post ) {
		wp_nonce_field( self::NONCE, self::NONCE );
		$this->select(
			Lesson_Renderer::OVERRIDE_META,
			__( 'Display', 'yallapp' ),
			(string) get_post_meta( $post->ID, Lesson_Renderer::OVERRIDE_META, true ),
			array(
				''        => __( 'Use the site setting', 'yallapp' ),
				'native'  => __( 'Native', 'yallapp' ),
				'webview' => __( 'Web view (exactly like the website)', 'yallapp' ),
			)
		);
		$this->select(
			Lesson_Renderer::EMBED_HEIGHT_META,
			__( 'Embedded app height', 'yallapp' ),
			(string) get_post_meta( $post->ID, Lesson_Renderer::EMBED_HEIGHT_META, true ),
			array(
				''           => __( 'Use the site setting', 'yallapp' ),
				'auto'       => __( 'Auto: match the embedded content', 'yallapp' ),
				'fit_screen' => __( 'Fit the screen', 'yallapp' ),
				'as_set'     => __( 'Keep the height set in the lesson', 'yallapp' ),
			)
		);
		// 51 A video from the app's Media library in the Yallapp dashboard.
		$link = (string) get_post_meta( $post->ID, Yallapp_Media::META, true );
		echo '<p><label for="' . esc_attr( Yallapp_Media::META ) . '"><strong>' . esc_html__( 'Yallapp video', 'yallapp' ) . '</strong></label><br>';
		echo '<input type="url" id="' . esc_attr( Yallapp_Media::META ) . '" name="' . esc_attr( Yallapp_Media::META ) . '" value="' . esc_attr( $link ) . '" class="widefat" placeholder="' . esc_attr( Yallapp_Media::origin() . '/m/…' ) . '">';
		echo '<span class="description">' . esc_html__( 'Paste a video\'s link from Media in your Yallapp dashboard. The app plays it as this lesson\'s video, in its own player, for students who may open the lesson.', 'yallapp' ) . '</span></p>';
	}

	/**
	 * Saves the box.
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post    Post.
	 * @return void
	 */
	public function save( $post_id, $post ) {
		if ( ! isset( $_POST[ self::NONCE ] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST[ self::NONCE ] ) ), self::NONCE ) ) {
			return;
		}
		if ( wp_is_post_revision( $post_id ) || ! in_array( $post->post_type, self::post_types(), true ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		$allowed = array(
			Lesson_Renderer::OVERRIDE_META     => array( 'native', 'webview' ),
			Lesson_Renderer::EMBED_HEIGHT_META => array( 'auto', 'fit_screen', 'as_set' ),
		);
		foreach ( $allowed as $key => $values ) {
			$value = isset( $_POST[ $key ] ) ? sanitize_key( wp_unslash( $_POST[ $key ] ) ) : '';
			if ( in_array( $value, $values, true ) ) {
				update_post_meta( $post_id, $key, $value );
			} else {
				delete_post_meta( $post_id, $key );
			}
		}
		// 51 Only a Yallapp media link is kept.
		$link = isset( $_POST[ Yallapp_Media::META ] ) ? trim( sanitize_text_field( wp_unslash( $_POST[ Yallapp_Media::META ] ) ) ) : '';
		if ( '' !== $link && Yallapp_Media::id_of( $link, Yallapp_Media::origin() ) ) {
			update_post_meta( $post_id, Yallapp_Media::META, esc_url_raw( $link ) );
		} else {
			delete_post_meta( $post_id, Yallapp_Media::META );
		}
	}

	/**
	 * Select field.
	 *
	 * @param string $key     Meta key.
	 * @param string $label   Label.
	 * @param string $current Current value.
	 * @param array  $options Value => label.
	 * @return void
	 */
	private function select( $key, $label, $current, array $options ) {
		echo '<p><label for="' . esc_attr( $key ) . '"><strong>' . esc_html( $label ) . '</strong></label><br>';
		echo '<select id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '" class="widefat">';
		foreach ( $options as $value => $text ) {
			printf( '<option value="%1$s"%2$s>%3$s</option>', esc_attr( $value ), selected( $current, $value, false ), esc_html( $text ) );
		}
		echo '</select></p>';
	}
}
