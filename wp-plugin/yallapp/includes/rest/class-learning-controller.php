<?php
/**
 * Learning routes.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Lms\Lms_Adapter;

/**
 * /me/courses, /me/wishlist, /lessons/* and /me/certificates.
 */
class Learning_Controller extends Controller {

	const POSITION_META = 'yallapp_position_';
	const WATCHED_META  = 'yallapp_watched_';

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$auth = array( $this, 'require_user' );
		$this->route(
			'/me/courses',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'my_courses' ),
				'permission_callback' => $auth,
				'args'                => array_merge(
					self::page_args(),
					array(
						'status' => array(
							'type'    => 'string',
							'enum'    => array( 'in_progress', 'completed' ),
							'default' => 'in_progress',
						),
					)
				),
			)
		);
		$this->route(
			'/me/wishlist',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'wishlist' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/me/wishlist/(?P<course_id>\d+)',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'add_to_wishlist' ),
					'permission_callback' => $auth,
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'remove_from_wishlist' ),
					'permission_callback' => $auth,
				),
			)
		);
		$this->route(
			'/lessons/(?P<lesson_id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'lesson' ),
				'permission_callback' => '__return_true',
			)
		);
		$this->route(
			'/lessons/(?P<lesson_id>\d+)/progress',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'save_progress' ),
				'permission_callback' => $auth,
				'args'                => array(
					'position_seconds' => array(
						'type'     => 'integer',
						'minimum'  => 0,
						'required' => true,
					),
					'watched_percent'  => array(
						'type'     => 'number',
						'minimum'  => 0,
						'maximum'  => 100,
						'required' => true,
					),
				),
			)
		);
		$this->route(
			'/lessons/(?P<lesson_id>\d+)/complete',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'complete' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/me/certificates',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'certificates' ),
				'permission_callback' => $auth,
			)
		);
	}

	/**
	 * GET /me/courses.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function my_courses( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$result = $lms->my_courses( get_current_user_id(), (string) $request['status'], (int) $request['page'], (int) $request['per_page'] );
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
	}

	/**
	 * GET /me/wishlist.
	 *
	 * @return \WP_REST_Response
	 */
	public function wishlist() {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		return $this->ok( array( 'items' => $lms->features()['wishlist'] ? $lms->wishlist( get_current_user_id() ) : array() ) );
	}

	/**
	 * PUT /me/wishlist/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function add_to_wishlist( WP_REST_Request $request ) {
		return $this->set_wishlist( (int) $request['course_id'], true );
	}

	/**
	 * DELETE /me/wishlist/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function remove_from_wishlist( WP_REST_Request $request ) {
		return $this->set_wishlist( (int) $request['course_id'], false );
	}

	/**
	 * GET /lessons/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function lesson( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$user_id   = get_current_user_id();
		$lesson_id = (int) $request['lesson_id'];
		$lesson    = $lms->lesson( $lesson_id, $user_id );
		if ( ! $lesson ) {
			return self::error( 'not_found', __( 'Lesson not found.', 'yallapp' ), 404 );
		}
		if ( ! $lms->can_view_lesson( $lesson_id, $user_id ) ) {
			return $user_id
				? self::error( 'not_enrolled', __( 'Enroll in this course to open this lesson.', 'yallapp' ), 403 )
				: self::error( 'unauthorized', __( 'Please sign in.', 'yallapp' ), 401 );
		}
		return $this->ok( $this->plugin->lesson_renderer()->render( $lesson, $user_id ) );
	}

	/**
	 * PUT /lessons/{id}/progress.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function save_progress( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$user_id   = get_current_user_id();
		$lesson_id = (int) $request['lesson_id'];
		if ( ! $lms->lesson( $lesson_id, $user_id ) || ! $lms->can_view_lesson( $lesson_id, $user_id ) ) {
			return self::error( 'not_enrolled', __( 'Enroll in this course to continue.', 'yallapp' ), 403 );
		}
		update_user_meta( $user_id, self::POSITION_META . $lesson_id, (int) $request['position_seconds'] );
		$watched = (float) $request['watched_percent'];
		if ( $watched > (float) get_user_meta( $user_id, self::WATCHED_META . $lesson_id, true ) ) {
			update_user_meta( $user_id, self::WATCHED_META . $lesson_id, min( 100, $watched ) );
		}
		return $this->no_content();
	}

	/**
	 * POST /lessons/{id}/complete.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function complete( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$user_id   = get_current_user_id();
		$lesson_id = (int) $request['lesson_id'];
		$lesson    = $lms->lesson( $lesson_id, $user_id );
		if ( ! $lesson ) {
			return self::error( 'not_found', __( 'Lesson not found.', 'yallapp' ), 404 );
		}
		$required = min( 100, (int) $this->plugin->settings()->get( 'required_watch_percent' ) );
		if ( $required > 0 && $lesson['video'] && ! $lesson['completed'] ) {
			$watched = (float) get_user_meta( $user_id, self::WATCHED_META . $lesson_id, true );
			if ( $watched < $required ) {
				return self::error(
					'watch_requirement_not_met',
					/* translators: %d: required percentage of the video. */
					sprintf( __( 'Watch at least %d%% of the video to complete this lesson.', 'yallapp' ), $required ),
					409
				);
			}
		}
		return $this->result( $lms->complete_lesson( $lesson_id, $user_id ) );
	}

	/**
	 * GET /me/certificates.
	 *
	 * @return \WP_REST_Response
	 */
	public function certificates() {
		$lms = $this->lms();
		return $lms instanceof Lms_Adapter ? $this->ok( array( 'items' => $lms->certificates( get_current_user_id() ) ) ) : $lms;
	}

	/**
	 * Adds or removes a wishlist entry.
	 *
	 * @param int  $course_id Course ID.
	 * @param bool $on        Add when true.
	 * @return \WP_REST_Response
	 */
	private function set_wishlist( $course_id, $on ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		if ( ! $lms->features()['wishlist'] ) {
			return self::error( 'feature_disabled', __( 'The wishlist is not available on this site.', 'yallapp' ), 403 );
		}
		$result = $lms->set_wishlist( get_current_user_id(), $course_id, $on );
		return is_wp_error( $result ) ? self::from_wp_error( $result ) : $this->no_content();
	}
}
