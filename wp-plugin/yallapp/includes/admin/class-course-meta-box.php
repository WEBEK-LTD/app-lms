<?php
/**
 * Per-course app settings.
 *
 * @package Yallapp
 */

namespace Yallapp\Admin;

defined( 'ABSPATH' ) || exit;

use WP_Post;
use Yallapp\Lms\Course_Restart;

/**
 * 73 Adds an "In the app" box to the course edit screen of the active LMS: "Students can
 * start this course again" (on by default). Off, the app doesn't offer "Start the course
 * again" for this course.
 */
class Course_Meta_Box {

	const NONCE = 'yallapp_course_meta';
	const FIELD = 'yallapp_restart';

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
	 * Post types that get the box: the active LMS's courses.
	 *
	 * @return string[]
	 */
	private static function post_types() {
		$lms = \Yallapp\Plugin::instance()->lms();
		return $lms ? array( $lms->post_types()['course'] ) : array();
	}

	/**
	 * Adds the box.
	 *
	 * @param string $post_type Post type.
	 * @return void
	 */
	public function add( $post_type ) {
		if ( in_array( $post_type, self::post_types(), true ) ) {
			add_meta_box( 'yallapp-course', __( 'In the app', 'yallapp' ), array( $this, 'render' ), $post_type, 'side' );
		}
	}

	/**
	 * Renders the box.
	 *
	 * @param WP_Post $post Course.
	 * @return void
	 */
	public function render( WP_Post $post ) {
		wp_nonce_field( self::NONCE, self::NONCE );
		printf(
			'<p><label><input type="checkbox" name="%1$s" value="1"%2$s> %3$s</label></p>',
			esc_attr( self::FIELD ),
			checked( Course_Restart::allowed_by_owner( $post->ID ), true, false ),
			esc_html__( 'Students can start this course again', 'yallapp' )
		);
		echo '<p class="description">' . esc_html__( 'Once they\'ve finished every lesson, the app offers "Start the course again", which clears their progress in this course. Only with an LMS that can reset a student\'s progress.', 'yallapp' ) . '</p>';
		$lms = \Yallapp\Plugin::instance()->lms();
		if ( $lms && ! $lms->can_reset_progress( $post->ID, 0 ) && 'learnpress' !== $lms->id() ) {
			echo '<p class="description">' . esc_html__( 'Your LMS has no way for Yallapp to reset a student\'s progress, so the app doesn\'t offer it.', 'yallapp' ) . '</p>';
		}
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
		if ( isset( $_POST[ self::FIELD ] ) ) {
			delete_post_meta( $post_id, Course_Restart::META );
		} else {
			update_post_meta( $post_id, Course_Restart::META, '1' );
		}
	}
}
