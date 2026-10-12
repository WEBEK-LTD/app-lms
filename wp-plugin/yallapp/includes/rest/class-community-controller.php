<?php
/**
 * Course reviews and Q&A.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use Yallapp\Auth\Rate_Limiter;
use Yallapp\Lms\Lms_Adapter;

/**
 * /courses/{id}/reviews, /courses/{id}/reviews/mine, /courses/{id}/questions,
 * /questions/{id} and /questions/{id}/answers.
 */
class Community_Controller extends Controller {

	const TEXT_MAX = 2000;

	/** Questions and replies a student may post per window. */
	const POST_LIMIT  = 10;
	const POST_WINDOW = 600;

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$auth   = array( $this, 'require_user' );
		$course = '/courses/(?P<course_id>\d+)';
		$this->route(
			$course . '/reviews',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'reviews' ),
				'permission_callback' => '__return_true',
				'args'                => self::page_args(),
			)
		);
		$this->route(
			$course . '/reviews/mine',
			array(
				'methods'             => 'PUT',
				'callback'            => array( $this, 'save_review' ),
				'permission_callback' => $auth,
				'args'                => array(
					'rating' => array(
						'type'     => 'integer',
						'minimum'  => 1,
						'maximum'  => 5,
						'required' => true,
					),
					'text'   => array(
						'type'      => 'string',
						'maxLength' => self::TEXT_MAX,
						'default'   => '',
					),
				),
			)
		);
		$this->route(
			$course . '/questions',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'questions' ),
					'permission_callback' => $auth,
					'args'                => self::page_args(),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'ask' ),
					'permission_callback' => $auth,
					'args'                => self::text_arg(),
				),
			)
		);
		$this->route(
			'/questions/(?P<question_id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'question' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/questions/(?P<question_id>\d+)/answers',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'answer' ),
				'permission_callback' => $auth,
				'args'                => self::text_arg(),
			)
		);
	}

	/**
	 * GET /courses/{id}/reviews.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function reviews( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$course_id = (int) $request['course_id'];
		$user_id   = get_current_user_id();
		if ( ! $lms->course( $course_id, $user_id ) ) {
			return self::not_found();
		}
		if ( ! $lms->features()['reviews'] ) {
			return self::error( 'feature_disabled', __( 'Reviews are turned off on this site.', 'yallapp' ), 403 );
		}
		$result = $lms->reviews( $course_id, $user_id, (int) $request['page'], (int) $request['per_page'] );
		return $this->ok(
			array_merge(
				self::page_meta( $request, $result['total'] ),
				array(
					'items'      => $result['items'],
					'summary'    => $result['summary'],
					'mine'       => $user_id ? $lms->my_review( $course_id, $user_id ) : null,
					'can_review' => $user_id > 0 && $lms->is_enrolled( $course_id, $user_id ),
				)
			)
		);
	}

	/**
	 * PUT /courses/{id}/reviews/mine.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function save_review( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$course_id = (int) $request['course_id'];
		$user_id   = get_current_user_id();
		if ( ! $lms->course( $course_id, $user_id ) ) {
			return self::not_found();
		}
		if ( ! $lms->is_enrolled( $course_id, $user_id ) ) {
			return self::error( 'not_enrolled', __( 'Enroll in this course to review it.', 'yallapp' ), 403 );
		}
		return $this->result( $lms->save_review( $course_id, $user_id, (int) $request['rating'], sanitize_textarea_field( (string) $request['text'] ) ) );
	}

	/**
	 * GET /courses/{id}/questions.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function questions( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$course_id = (int) $request['course_id'];
		$denied    = $this->check_qna( $lms, $course_id );
		if ( $denied ) {
			return $denied;
		}
		$result = $lms->questions( $course_id, get_current_user_id(), (int) $request['page'], (int) $request['per_page'] );
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
	}

	/**
	 * POST /courses/{id}/questions.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function ask( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$course_id = (int) $request['course_id'];
		$denied    = $this->check_qna( $lms, $course_id );
		if ( $denied ) {
			return $denied;
		}
		$text = self::clean_text( $request );
		if ( '' === $text ) {
			return self::error( 'invalid_request', __( 'Please write your question.', 'yallapp' ), 400 );
		}
		$limited = $this->rate_limited();
		return $limited ? $limited : $this->result( $lms->ask( $course_id, get_current_user_id(), $text ), 201 );
	}

	/**
	 * GET /questions/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function question( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$thread = $lms->question( (int) $request['question_id'], get_current_user_id() );
		if ( ! $thread ) {
			return self::not_found();
		}
		$denied = $this->check_qna( $lms, (int) $thread['course_id'] );
		return $denied ? $denied : $this->ok( $thread );
	}

	/**
	 * POST /questions/{id}/answers.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function answer( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$user_id = get_current_user_id();
		$thread  = $lms->question( (int) $request['question_id'], $user_id );
		if ( ! $thread ) {
			return self::not_found();
		}
		$denied = $this->check_qna( $lms, (int) $thread['course_id'] );
		if ( $denied ) {
			return $denied;
		}
		$text = self::clean_text( $request );
		if ( '' === $text ) {
			return self::error( 'invalid_request', __( 'Please write your reply.', 'yallapp' ), 400 );
		}
		$limited = $this->rate_limited();
		return $limited ? $limited : $this->result( $lms->answer( (int) $thread['id'], $user_id, $text ), 201 );
	}

	/**
	 * An error response when the student can't use the course's Q&A, otherwise null.
	 *
	 * @param Lms_Adapter $lms       Adapter.
	 * @param int         $course_id Course ID.
	 * @return WP_REST_Response|null
	 */
	private function check_qna( Lms_Adapter $lms, $course_id ) {
		$user_id = get_current_user_id();
		if ( ! $lms->course( $course_id, $user_id ) ) {
			return self::not_found();
		}
		if ( ! $lms->qna_enabled( $course_id ) ) {
			return self::error( 'feature_disabled', __( 'Questions are turned off for this course.', 'yallapp' ), 403 );
		}
		$teaches = current_user_can( 'manage_options' ) || (int) get_post_field( 'post_author', $course_id ) === $user_id;
		if ( ! $teaches && ! $lms->is_enrolled( $course_id, $user_id ) ) {
			return self::error( 'not_enrolled', __( 'Enroll in this course to see and ask questions.', 'yallapp' ), 403 );
		}
		return null;
	}

	/**
	 * A 429 response when the student posted too much recently, otherwise null.
	 *
	 * @return WP_REST_Response|null
	 */
	private function rate_limited() {
		$wait = Rate_Limiter::hit( 'qna:' . get_current_user_id(), self::POST_LIMIT, self::POST_WINDOW );
		if ( ! $wait ) {
			return null;
		}
		return self::error( 'rate_limited', __( 'You have posted a lot in a short time. Please wait a few minutes.', 'yallapp' ), 429, array( 'retry_after_seconds' => $wait ) );
	}

	/**
	 * The `text` argument.
	 *
	 * @return array
	 */
	private static function text_arg() {
		return array(
			'text' => array(
				'type'      => 'string',
				'required'  => true,
				'maxLength' => self::TEXT_MAX,
			),
		);
	}

	/**
	 * Posted text without markup.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return string
	 */
	private static function clean_text( WP_REST_Request $request ) {
		return trim( sanitize_textarea_field( (string) $request['text'] ) );
	}

	/**
	 * 404 response.
	 *
	 * @return WP_REST_Response
	 */
	private static function not_found() {
		return self::error( 'not_found', __( 'This course or question no longer exists.', 'yallapp' ), 404 );
	}
}
