<?php
/**
 * Per-post notification opt-out, for News & blog apps.
 *
 * @package Yallapp
 */

namespace Yallapp\Admin;

defined( 'ABSPATH' ) || exit;

use WP_Post;
use Yallapp\Plugin;
use Yallapp\Push\Push_Service;

/**
 * Adds an "In the app" box to the post edit screen: "Don't notify app users about this
 * post". Saved before the notification goes out (Push_Service waits a minute after publishing).
 */
class Post_Meta_Box {

	const NONCE = 'yallapp_post_meta';
	const FIELD = 'yallapp_no_push';

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Hooks into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'add_meta_boxes_post', array( $this, 'add' ) );
		add_action( 'save_post_post', array( $this, 'save' ), 10, 2 );
	}

	/**
	 * Adds the box.
	 *
	 * @return void
	 */
	public function add() {
		add_meta_box( 'yallapp-post', __( 'In the app', 'yallapp' ), array( $this, 'render' ), 'post', 'side' );
	}

	/**
	 * Renders the box.
	 *
	 * @param WP_Post $post Post.
	 * @return void
	 */
	public function render( WP_Post $post ) {
		wp_nonce_field( self::NONCE, self::NONCE );
		if ( get_post_meta( $post->ID, Push_Service::NOTIFIED_META, true ) ) {
			echo '<p>' . esc_html__( 'App users were notified about this post.', 'yallapp' ) . '</p>';
			return;
		}
		printf(
			'<p><label><input type="checkbox" name="%1$s" value="1"%2$s> %3$s</label></p>',
			esc_attr( self::FIELD ),
			checked( (bool) get_post_meta( $post->ID, Push_Service::NO_PUSH_META, true ), true, false ),
			esc_html__( 'Don\'t notify app users about this post', 'yallapp' )
		);
		if ( ! $this->plugin->settings()->get( 'notify_new_post' ) ) {
			echo '<p class="description">' . esc_html__( 'New posts aren\'t sent to app users. Turn on "Notify app users about new posts" in Yallapp › Settings › Notifications to send them.', 'yallapp' ) . '</p>';
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
		if ( wp_is_post_revision( $post_id ) || 'post' !== $post->post_type || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		if ( ! empty( $_POST[ self::FIELD ] ) ) {
			update_post_meta( $post_id, Push_Service::NO_PUSH_META, 1 );
		} else {
			delete_post_meta( $post_id, Push_Service::NO_PUSH_META );
		}
	}
}
