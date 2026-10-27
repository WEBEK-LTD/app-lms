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
use Yallapp\Billing\Site_Plans;
use Yallapp\Billing\Store_Billing;
use Yallapp\Lms\Course_Completion;
use Yallapp\Lms\Course_Password;
use Yallapp\Lms\Course_Restart;
use Yallapp\Lms\Lms_Adapter;
use Yallapp\Lms\Purchase_Rules;
use Yallapp\Lms\Site_Memberships;

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
		$settings           = $this->plugin->settings();
		$course['purchase'] = array(
			'action' => Purchase_Rules::action(
				$course['enrolled'],
				$course['price']['is_free'],
				(string) $request['platform'],
				(bool) $settings->get( 'free_enrollment' ),
				(bool) $settings->get( 'android_enroll_button' ),
				(bool) $course['has_checkout']
			),
		);
		// 100.4 Where the app sells through the store on this platform: the course's store product.
		$billing                                = Billing_Controller::billing( $this->plugin );
		$store_on                               = null !== Store_Billing::config( $billing, (string) $request['platform'] );
		$product                                = $store_on ? Store_Billing::course_product( $billing, (int) $course['id'] ) : null;
		$course['purchase']['action']           = Store_Billing::course_action( $course['purchase']['action'], ! $course['price']['is_free'], (bool) $course['enrolled'], $store_on, $product );
		$course['purchase']['store_product_id'] = 'store' === $course['purchase']['action'] ? $product : null;
		// 90.3 A course that needs a membership on the website: the plans, and no way in without one.
		$membership                   = Site_Memberships::course( (int) $course['id'], get_current_user_id() );
		$course['membership']         = $membership;
		$course['purchase']['action'] = Site_Memberships::action( $course['purchase']['action'], $membership, (bool) $course['enrolled'], (bool) $settings->get( 'free_enrollment' ) );
		if ( 'store' !== $course['purchase']['action'] ) {
			$course['purchase']['store_product_id'] = null;
		}
		// 100.4 The store products of the plans that open it, offered to a student without one.
		if ( $membership && $store_on ) {
			$course['membership']['store_product_ids'] = Store_Billing::plan_products( $billing, Site_Plans::course_plan_ids( (int) $course['id'] ) );
		}
		$course['intro_video'] = $this->plugin->lesson_renderer()->video( $course['intro_video'], get_current_user_id() );
		unset( $course['has_checkout'] );
		// 62 A password on the website: the app opens the website for it, never asks for it.
		$post                         = get_post( (int) $course['id'] );
		$course['password_protected'] = Course_Password::protected_post( $post );
		$link                         = $post ? get_permalink( $post ) : false;
		$course['website_url']        = is_string( $link ) && '' !== $link ? $link : null;
		// 73 Whether a student who finished it can start it again in the app.
		$course['can_restart'] = Course_Restart::can_restart( $lms, (int) $course['id'], get_current_user_id() );
		$enrolled              = (bool) $course['enrolled'];
		if ( Course_Password::locked(
			$post,
			get_current_user_id(),
			static function () use ( $enrolled ) {
				return $enrolled;
			}
		) ) {
			return $this->ok( Course_Password::closed( $course ) );
		}
		// 45 An enrolled student's progress, so a finished course says so, and their certificate.
		$user_id = get_current_user_id();
		if ( $user_id && $course['enrolled'] ) {
			$progress                  = $lms->progress( (int) $course['id'], $user_id );
			$certificate               = ! empty( $progress['course_completed'] ) ? Course_Completion::certificate( $lms, (int) $course['id'], $user_id ) : null;
			$course['progress']        = Course_Completion::fill( $progress, $user_id, $certificate );
			$course['certificate_url'] = $certificate ? (string) $certificate['url'] : null;
		}
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
		// 62 A course with a password on the website shows no topics to a student who isn't in it.
		if ( Course_Password::locked( get_post( (int) $request['course_id'] ), get_current_user_id(), array( $lms, 'is_enrolled' ) ) ) {
			$topics = array();
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
		// 62 Its password is entered on the website: the student joins there.
		if ( Course_Password::locked( get_post( (int) $request['course_id'] ), get_current_user_id(), array( $lms, 'is_enrolled' ) ) ) {
			return self::error( 'enrollment_disabled', __( 'This course has a password: join it on the website.', 'yallapp' ), 403 );
		}
		// 90.3 A course that needs a membership on the website: its members join it (sites set
		// such courses free in the LMS and protect them with Paid Memberships Pro), others can't.
		$membership = Site_Memberships::course( (int) $request['course_id'], get_current_user_id() );
		if ( $membership && ! $membership['has_access'] && ! $lms->is_enrolled( (int) $request['course_id'], get_current_user_id() ) ) {
			return self::membership_required( $membership );
		}
		return $this->result( $lms->enroll_free( (int) $request['course_id'], get_current_user_id() ) );
	}

	/**
	 * 90.3 The answer to joining a course that needs a membership the student doesn't have.
	 *
	 * @param array $membership `Site_Memberships::course()`.
	 * @return \WP_REST_Response
	 */
	public static function membership_required( array $membership ) {
		return self::error(
			'membership_required',
			/* translators: %s: the membership plans that open the course, comma-separated. */
			sprintf( __( 'This course comes with a membership on our website: %s.', 'yallapp' ), implode( ', ', $membership['plans'] ) ),
			403
		);
	}
}
