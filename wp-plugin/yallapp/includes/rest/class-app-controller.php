<?php
/**
 * App configuration and home screen.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Lms\Purchase_Rules;

/**
 * GET /config and GET /home.
 */
class App_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/config',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'config' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'platform'    => self::platform_arg(),
					'app_version' => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);
		$this->route(
			'/home',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'home' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * GET /config.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function config( WP_REST_Request $request ) {
		$settings = $this->plugin->settings();
		$platform = (string) $request['platform'];
		$gate     = new Gatekeeper( $this->plugin );
		$blocked  = $gate->blocked_reason();
		if ( $blocked && in_array( $blocked['code'], array( 'license_inactive', 'account_suspended' ), true ) ) {
			return self::error( $blocked['code'], $blocked['message'], 503, array( 'contact' => $blocked['contact'] ) );
		}
		$contact = $gate->contact();
		$license = $this->plugin->license();

		$lms        = $this->plugin->lms();
		$features   = $lms ? $lms->features() : array();
		$min        = (string) $settings->get( 'min_app_version' );
		$logo       = (int) $settings->get( 'logo_id' ) ? wp_get_attachment_url( (int) $settings->get( 'logo_id' ) ) : false;
		$app_name   = (string) $settings->get( 'app_name' );
		$terms_id   = (int) $settings->get( 'terms_page_id' );
		$privacy_id = (int) $settings->get( 'privacy_page_id' );
		$whatsapp   = (string) $settings->get( 'support_whatsapp' );
		$methods    = $this->plugin->sign_in()->methods();
		$by_email   = in_array( 'email', $methods, true );

		return $this->ok(
			array(
				'site'      => array(
					'name'             => '' !== $app_name ? $app_name : html_entity_decode( get_bloginfo( 'name' ), ENT_QUOTES, 'UTF-8' ),
					'url'              => home_url( '/' ),
					'terms_url'        => $terms_id ? get_permalink( $terms_id ) : null,
					'privacy_url'      => $privacy_id ? get_permalink( $privacy_id ) : ( get_privacy_policy_url() ? get_privacy_policy_url() : null ),
					'support_whatsapp' => '' !== $whatsapp ? $whatsapp : null,
					'support_email'    => $contact['email'],
				),
				'branding'  => array(
					'logo_url'      => $logo ? $logo : null,
					'primary_color' => (string) $settings->get( 'primary_color' ),
				),
				'features'  => array(
					'lms'          => $lms ? $lms->id() : null,
					'lms_version'  => $lms ? $lms->version() : '',
					'pro'          => $lms ? $lms->is_pro() : false,
					'certificates' => ! empty( $features['certificates'] ),
					'quizzes'      => ! empty( $features['quizzes'] ),
					'wishlist'     => ! empty( $features['wishlist'] ),
					'reviews'      => ! empty( $features['reviews'] ),
					'qna'          => ! empty( $features['qna'] ),
					// The app's plan decides push and offline mode (license features).
					'push'         => $this->plugin->push()->is_configured() && $license->has_feature( 'push' ),
					'offline'      => $license->has_feature( 'offline_downloads' ),
					'orders'       => $lms ? $lms->sells_courses() : \Yallapp\Commerce\Woo_Orders::available(),
				),
				'store'     => \Yallapp\Store\Catalog::available() ? $this->plugin->store_checkout()->config() : null,
				'bookings'  => Bookings_Controller::config( $this->plugin->bookings() ),
				'auth'      => array(
					'signup_allowed'       => (bool) $settings->get( 'signup_allowed' ),
					'signup_fields'        => $this->plugin->sign_in()->signup_fields(),
					'default_country_code' => (string) $settings->get( 'default_country_code' ),
					// Phone (a code), email (the WordPress email and password) or both.
					'methods'              => $methods,
					// `preview: true` at /auth/otp/request signs in only the store review number.
					'preview_sign_in'      => true,
				) + ( $by_email ? array(
					'email_sign_in'      => 'password',
					'password_reset_url' => wp_lostpassword_url(),
				) : array() ),
				'purchases' => array(
					'enroll_button'     => Purchase_Rules::enroll_button( $platform, (bool) $settings->get( 'android_enroll_button' ) ),
					'free_enrollment'   => (bool) $settings->get( 'free_enrollment' ),
					'checkout_opens_in' => (string) $settings->get( 'checkout_opens_in' ),
				),
				'content'   => array(
					'block_screen_capture'    => (bool) $settings->get( 'block_screen_capture' ),
					'watermark'               => (string) $settings->get( 'watermark' ),
					'embed_fullscreen_button' => (bool) $settings->get( 'embed_fullscreen_button' ),
					'embed_height'            => (string) $settings->get( 'embed_height' ),
					'code_highlighting'       => (bool) $settings->get( 'code_highlighting' ),
					'required_watch_percent'  => min( 100, (int) $settings->get( 'required_watch_percent' ) ),
				),
				'app'       => array(
					'update_required'     => '' !== $min && version_compare( (string) $request['app_version'], $min, '<' ),
					'maintenance'         => null !== $blocked,
					'maintenance_message' => $blocked ? $blocked['message'] : null,
				),
			) + $this->look()
		);
	}

	/**
	 * Config.appearance and Config.languages. Without a published look, appearance is left
	 * out and the app keeps its build's template and font.
	 *
	 * @return array
	 */
	private function look() {
		$pages      = $this->plugin->pages();
		$appearance = $pages->appearance();
		return array_merge(
			$appearance ? array( 'appearance' => $appearance ) : array(),
			array( 'languages' => $pages->languages() )
		);
	}

	/**
	 * GET /home.
	 *
	 * @return \WP_REST_Response
	 */
	public function home() {
		$lms = $this->lms();
		if ( ! $lms instanceof \Yallapp\Lms\Lms_Adapter ) {
			return $lms;
		}
		$settings = $this->plugin->settings();
		$user_id  = get_current_user_id();
		$sections = array();

		foreach ( (array) $settings->get( 'home_sections' ) as $type ) {
			if ( 'banner' === $type ) {
				$image = (int) $settings->get( 'banner_image_id' ) ? wp_get_attachment_url( (int) $settings->get( 'banner_image_id' ) ) : false;
				if ( $image ) {
					$course     = (int) $settings->get( 'banner_course_id' );
					$sections[] = array(
						'type'   => 'banner',
						'title'  => null,
						'banner' => array(
							'image_url'      => $image,
							'link_course_id' => $course ? $course : null,
						),
					);
				}
			} elseif ( 'continue_learning' === $type && $user_id ) {
				$mine = $lms->my_courses( $user_id, 'in_progress', 1, 1 );
				if ( $mine['items'] ) {
					$sections[] = array(
						'type'   => 'continue_learning',
						'title'  => __( 'Continue learning', 'yallapp' ),
						'course' => $mine['items'][0],
					);
				}
			} elseif ( 'categories' === $type ) {
				$categories = $lms->categories();
				if ( $categories ) {
					$sections[] = array(
						'type'       => 'categories',
						'title'      => __( 'Categories', 'yallapp' ),
						'categories' => $categories,
					);
				}
			} elseif ( 'featured_courses' === $type ) {
				$ids = (array) $settings->get( 'featured_course_ids' );
				if ( $ids ) {
					$courses = $lms->courses(
						array(
							'ids'      => $ids,
							'per_page' => 20,
						),
						$user_id
					);
					if ( $courses['items'] ) {
						$sections[] = array(
							'type'    => 'featured_courses',
							'title'   => __( 'Featured courses', 'yallapp' ),
							'courses' => $courses['items'],
						);
					}
				}
			} elseif ( 'latest_courses' === $type ) {
				$courses = $lms->courses( array( 'per_page' => 10 ), $user_id );
				if ( $courses['items'] ) {
					$sections[] = array(
						'type'    => 'latest_courses',
						'title'   => __( 'Latest courses', 'yallapp' ),
						'courses' => $courses['items'],
					);
				}
			}
		}
		return $this->ok( array( 'sections' => $sections ) );
	}
}
