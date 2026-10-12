<?php
/**
 * Catalog routes.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Lms\Lms_Adapter;
use Yallapp\Lms\Purchase_Rules;

/**
 * /categories, /courses, /courses/{id}, /courses/{id}/curriculum and /courses/{id}/enroll.
 */
class Catalog_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/categories',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'categories' ),
				'permission_callback' => '__return_true',
			)
		);
		$this->route(
			'/courses',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'courses' ),
				'permission_callback' => '__return_true',
				'args'                => array_merge(
					self::page_args(),
					array(
						'search'   => array( 'type' => 'string' ),
						'category' => array( 'type' => 'integer' ),
						'price'    => array(
							'type'    => 'string',
							'enum'    => array( 'all', 'free', 'paid' ),
							'default' => 'all',
						),
						'orderby'  => array(
							'type'    => 'string',
							'enum'    => array( 'newest', 'popular', 'title' ),
							'default' => 'newest',
						),
					)
				),
			)
		);
		$this->route(
			'/courses/(?P<course_id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'course' ),
				'permission_callback' => '__return_true',
				'args'                => array( 'platform' => self::platform_arg() ),
			)
		);
		$this->route(
			'/courses/(?P<course_id>\d+)/curriculum',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'curriculum' ),
				'permission_callback' => '__return_true',
			)
		);
		$this->route(
			'/courses/(?P<course_id>\d+)/enroll',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'enroll' ),
				'permission_callback' => array( $this, 'require_user' ),
			)
		);
	}

	/**
	 * GET /categories.
	 *
	 * @return \WP_REST_Response
	 */
	public function categories() {
		$lms = $this->lms();
		return $lms instanceof Lms_Adapter ? $this->ok( array( 'items' => $lms->categories() ) ) : $lms;
	}

	/**
	 * GET /courses.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function courses( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$result = $lms->courses(
			array(
				'page'     => (int) $request['page'],
				'per_page' => (int) $request['per_page'],
				'search'   => (string) $request['search'],
				'category' => (int) $request['category'],
				'price'    => (string) $request['price'],
				'orderby'  => (string) $request['orderby'],
			),
			get_current_user_id()
		);
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
	}

	/**
	 * GET /courses/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function course( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$course = $lms->course( (int) $request['course_id'], get_current_user_id() );
		if ( ! $course ) {
			return self::error( 'not_found', __( 'Course not found.', 'yallapp' ), 404 );
		}
		$settings              = $this->plugin->settings();
		$course['purchase']    = array(
			'action' => Purchase_Rules::action(
				$course['enrolled'],
				$course['price']['is_free'],
				(string) $request['platform'],
				(bool) $settings->get( 'free_enrollment' ),
				(bool) $settings->get( 'android_enroll_button' ),
				(bool) $course['has_checkout']
			),
		);
		$course['intro_video'] = $this->plugin->lesson_renderer()->video( $course['intro_video'], get_current_user_id() );
		unset( $course['has_checkout'] );
		return $this->ok( $course );
	}

	/**
	 * GET /courses/{id}/curriculum.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function curriculum( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		$topics = $lms->curriculum( (int) $request['course_id'], get_current_user_id() );
		if ( null === $topics ) {
			return self::error( 'not_found', __( 'Course not found.', 'yallapp' ), 404 );
		}
		return $this->ok( array( 'topics' => $topics ) );
	}

	/**
	 * POST /courses/{id}/enroll.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function enroll( WP_REST_Request $request ) {
		$lms = $this->lms();
		if ( ! $lms instanceof Lms_Adapter ) {
			return $lms;
		}
		if ( ! $this->plugin->settings()->get( 'free_enrollment' ) ) {
			return self::error( 'enrollment_disabled', __( 'Enroll on the website to join this course.', 'yallapp' ), 403 );
		}
		return $this->result( $lms->enroll_free( (int) $request['course_id'], get_current_user_id() ) );
	}
}
