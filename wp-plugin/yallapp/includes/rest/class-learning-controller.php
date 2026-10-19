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
use Yallapp\Content\Downloads;
use Yallapp\Lms\Course_Completion;
use Yallapp\Lms\Lms_Adapter;

/**
 * /me/courses, /me/wishlist, /lessons/*, /me/certificates and 45 /me/downloads/check.
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
			'/lessons/(?P<lesson_id>\d+)/download',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'download' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/me/downloads/check',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'check_downloads' ),
				'permission_callback' => $auth,
				'args'                => array(
					'lesson_ids' => array(
						'type'     => 'array',
						'items'    => array( 'type' => 'integer' ),
						'maxItems' => Downloads::MAX_CHECK,
						'required' => true,
					),
				),
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
		$user_id = get_current_user_id();
		$result  = $lms->my_courses( $user_id, (string) $request['status'], (int) $request['page'], (int) $request['per_page'] );
		$items   = array();
		foreach ( $result['items'] as $item ) {
			// 45 When each completed course was completed, when known.
			if ( isset( $item['progress'] ) && is_array( $item['progress'] ) ) {
				$certificate      = ! empty( $item['progress']['course_completed'] ) && ! empty( $item['certificate_url'] )
					? array( 'issued_at' => self::certificate_date( $lms, (int) $item['progress']['course_id'], $user_id ) )
					: null;
				$item['progress'] = Course_Completion::fill( $item['progress'], $user_id, $certificate );
			}
			$items[] = $item;
		}
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $items ) ) );
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
		$lesson    = self::visible_lesson( $lms, $lesson_id, $user_id );
		if ( ! $lesson ) {
			return self::error( 'not_found', __( 'Lesson not found.', 'yallapp' ), 404 );
		}
		if ( ! $lms->can_view_lesson( $lesson_id, $user_id ) ) {
			return $user_id
				? self::error( 'not_enrolled', __( 'Enroll in this course to open this lesson.', 'yallapp' ), 403 )
				: self::error( 'unauthorized', __( 'Please sign in.', 'yallapp' ), 401 );
		}
		// 51 A video from the Yallapp Media library: signed by Yallapp now that the LMS let the student in.
		$lesson          = $this->plugin->yallapp_media()->apply( $lesson, 'play' );
		$data            = $this->plugin->lesson_renderer()->render( $lesson, $user_id );
		$data['offline'] = $this->plugin->downloads()->offline( $data, $lesson );
		return $this->ok( $data );
	}

	/**
	 * 45 POST /lessons/{id}/download: signed links to the lesson's files for offline viewing.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function download( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$downloads = $this->plugin->downloads();
		if ( ! $downloads->enabled() ) {
			return self::error( 'feature_disabled', __( 'Lessons can\'t be saved for offline viewing in this app.', 'yallapp' ), 403 );
		}
		$user_id   = get_current_user_id();
		$lesson_id = (int) $request['lesson_id'];
		$lesson    = self::visible_lesson( $lms, $lesson_id, $user_id );
		if ( ! $lesson ) {
			return self::error( 'not_found', __( 'Lesson not found.', 'yallapp' ), 404 );
		}
		if ( ! $lms->can_view_lesson( $lesson_id, $user_id ) ) {
			return self::error( 'not_enrolled', __( 'Enroll in this course to open this lesson.', 'yallapp' ), 403 );
		}
		// 51 A Yallapp Media library video: a link to save it, never the lesson without it.
		$lesson = $this->plugin->yallapp_media()->apply( $lesson, 'download' );
		if ( is_wp_error( $lesson ) ) {
			return self::error( $lesson->get_error_code(), $lesson->get_error_message(), 503 );
		}
		$data   = $this->plugin->lesson_renderer()->render( $lesson, $user_id );
		$reason = Downloads::blocker( $data, $lesson['video'] ?? null );
		if ( null !== $reason ) {
			return self::error(
				'not_downloadable',
				'video_site' === $reason
					? __( 'This lesson\'s video plays from a video site, so it needs the internet.', 'yallapp' )
					: __( 'This lesson shows a web page, so it needs the internet.', 'yallapp' ),
				409,
				array( 'details' => array( 'reason' => $reason ) )
			);
		}
		return $this->ok( $downloads->package( $data, $lesson, $user_id ) );
	}

	/**
	 * 45 POST /me/downloads/check: which saved lessons the student may keep.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function check_downloads( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$user_id = get_current_user_id();
		$enabled = $this->plugin->downloads()->enabled();
		$allowed = array();
		$refused = array();
		foreach ( array_unique( array_map( 'intval', (array) $request['lesson_ids'] ) ) as $lesson_id ) {
			if ( $enabled && $lesson_id > 0 && self::visible_lesson( $lms, $lesson_id, $user_id ) && $lms->can_view_lesson( $lesson_id, $user_id ) ) {
				$allowed[] = $lesson_id;
			} else {
				$refused[] = $lesson_id;
			}
		}
		return $this->ok(
			array(
				'allowed'   => $allowed,
				'refused'   => $refused,
				'downloads' => $enabled,
				'keep_days' => Downloads::KEEP_DAYS,
			)
		);
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
		if ( ! self::visible_lesson( $lms, $lesson_id, $user_id ) || ! $lms->can_view_lesson( $lesson_id, $user_id ) ) {
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
		$lesson    = self::visible_lesson( $lms, $lesson_id, $user_id );
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
		$progress = $lms->complete_lesson( $lesson_id, $user_id );
		if ( is_array( $progress ) ) {
			// 45 The moment the app completed the course's last item.
			Course_Completion::record( $progress, $user_id );
			$progress = Course_Completion::fill( $progress, $user_id );
		}
		return $this->result( $progress );
	}

	/**
	 * 50 The raw lesson, or null when there is none or its course is private and the user may
	 * not open it (Course_Visibility), its free preview lessons included: as if it didn't exist.
	 *
	 * @param Lms_Adapter $lms       LMS.
	 * @param int         $lesson_id Lesson ID.
	 * @param int         $user_id   User, or 0.
	 * @return array|null
	 */
	private static function visible_lesson( Lms_Adapter $lms, $lesson_id, $user_id ) {
		$lesson    = $lms->lesson( $lesson_id, $user_id );
		$course_id = $lesson ? (int) ( $lesson['course_id'] ?? 0 ) : 0;
		return ( $lesson && ( $course_id <= 0 || $lms->course_visible( $course_id, $user_id ) ) ) ? $lesson : null;
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
	 * 45 The date of the student's certificate for a course, when the LMS gives one.
	 *
	 * @param Lms_Adapter $lms       Adapter.
	 * @param int         $course_id Course.
	 * @param int         $user_id   Student.
	 * @return string|null
	 */
	private static function certificate_date( Lms_Adapter $lms, $course_id, $user_id ) {
		$certificate = Course_Completion::certificate( $lms, $course_id, $user_id );
		return $certificate && ! empty( $certificate['issued_at'] ) ? (string) $certificate['issued_at'] : null;
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
