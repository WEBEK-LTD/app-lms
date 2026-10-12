<?php
/**
 * Quiz routes.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Content\Magic_Links;
use Yallapp\Lms\Lms_Adapter;

/**
 * /quizzes/* and /me/quiz-attempts.
 */
class Quiz_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$auth = array( $this, 'require_user' );
		$this->route(
			'/quizzes/(?P<quiz_id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'quiz' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/quizzes/(?P<quiz_id>\d+)/attempts',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'start' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/quizzes/(?P<quiz_id>\d+)/attempts/(?P<attempt_id>\d+)/submit',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'submit' ),
				'permission_callback' => $auth,
				'args'                => array(
					'answers' => array(
						'type'     => 'array',
						'required' => true,
					),
				),
			)
		);
		$this->route(
			'/me/quiz-attempts',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'attempts' ),
				'permission_callback' => $auth,
				'args'                => self::page_args(),
			)
		);
	}

	/**
	 * GET /quizzes/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function quiz( WP_REST_Request $request ) {
		$lms = $this->lms();
		return $lms instanceof Lms_Adapter ? $this->result( $lms->quiz( (int) $request['quiz_id'], get_current_user_id() ) ) : $lms;
	}

	/**
	 * POST /quizzes/{id}/attempts.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function start( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$attempt = $lms->start_attempt( (int) $request['quiz_id'], get_current_user_id() );
		if ( is_wp_error( $attempt ) ) {
			return self::from_wp_error( $attempt );
		}
		$link = null;
		foreach ( $attempt['questions'] as $index => $question ) {
			if ( 'webview' === $question['render_mode'] && $question['webview_url'] ) {
				if ( null === $link ) {
					$link = Magic_Links::create( get_current_user_id(), $question['webview_url'], true );
				}
				$attempt['questions'][ $index ]['webview_url'] = $link;
			}
		}
		return $this->ok( $attempt, 201 );
	}

	/**
	 * POST /quizzes/{id}/attempts/{attempt_id}/submit.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function submit( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$answers = array_values( array_filter( (array) $request['answers'], 'is_array' ) );
		return $this->result( $lms->submit_attempt( (int) $request['quiz_id'], (int) $request['attempt_id'], get_current_user_id(), $answers ) );
	}

	/**
	 * GET /me/quiz-attempts.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function attempts( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$result = $lms->attempts( get_current_user_id(), (int) $request['page'], (int) $request['per_page'] );
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
	}
}
